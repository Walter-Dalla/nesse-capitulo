import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BookCover } from "../components/BookCover";
import { IconTrash } from "../components/Icons";
import { ErrorBox, Page, Spinner } from "../components/Layout";
import { Sheet } from "../components/Sheet";
import { Stars } from "../components/Stars";
import { toast } from "../components/Toast";
import { YearSelect } from "../components/YearSelect";
import { useDetails, useItem, useRemoveItem, useUpdateItem } from "../lib/hooks";
import { DateField } from "../components/DateField";
import { currentYear, formatAuthors } from "../lib/format";
import { changedFields, readDraft, writeDraft, type ItemDraft } from "../lib/itemDraft";
import { SOURCE_LABEL, STATUS_ACTION, STATUS_ORDER } from "../lib/types";

export function BookDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useItem(id);
  const update = useUpdateItem(id);
  const remove = useRemoveItem();
  const item = query.data?.item;

  // nota, status, datas, ano e resenha ficam aqui até o usuário clicar em Salvar
  const [draft, setDraftState] = useState<ItemDraft>(() => readDraft(id));
  const [showDesc, setShowDesc] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // sinopse vem do cache do navegador ou do servidor, que a grava no banco
  const details = useDetails(id, Boolean(item) && item?.book.source !== "manual");

  function setDraft(next: ItemDraft) {
    setDraftState(next);
    writeDraft(id, next);
  }

  const change = (patch: ItemDraft) => setDraft({ ...draft, ...patch });

  async function save() {
    if (!item) return;
    try {
      await update.mutateAsync(changedFields(item, draft));
      setDraft({});
      toast("Alterações salvas");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function onRemove() {
    if (!item) return;
    try {
      await remove.mutateAsync(item.id);
      writeDraft(id, {});
      toast("Removido da estante");
      navigate("/", { replace: true });
    } catch (e) {
      setConfirmRemove(false);
      toast((e as Error).message, "error");
    }
  }

  if (query.isPending) return <Page><Spinner /></Page>;
  if (query.isError || !item) return <Page><ErrorBox error={query.error ?? new Error("Livro não encontrado")} /></Page>;

  const { book } = item;
  const current = { ...item, ...draft };
  const dirty = Object.keys(changedFields(item, draft)).length > 0;

  return (
    <Page action={<button type="button" onClick={() => setConfirmRemove(true)} className="rounded-xl p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" aria-label="Remover da estante"><IconTrash /></button>}>
      <section className="flex gap-4">
        <BookCover book={book} size="L" className="w-28" />
        <div className="min-w-0 flex-1 py-1">
          <h1 className="text-xl font-bold leading-tight">{book.title}</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-300">{formatAuthors(book.authors)}</p>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            {[book.publishedYear, book.pageCount ? `${book.pageCount} páginas` : null, book.isbn13 ? `ISBN ${book.isbn13}` : null].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3">
            <Stars value={current.rating} onChange={(v) => change({ rating: v })} size="lg" />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <span className="label">Status</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status">
          {STATUS_ORDER.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={current.status === s} disabled={update.isPending} onClick={() => change({ status: s })} className={current.status === s ? "btn-primary" : "btn-secondary"}>
              {STATUS_ACTION[s]}
            </button>
          ))}
        </div>
      </section>

      {current.status !== "want" && (
        <section className="card fade-in mt-4 grid grid-cols-2 gap-3 p-4">
          <div className={current.status === "read" ? "" : "col-span-2"}>
            <label className="label" htmlFor="d-start">Comecei em</label>
            <DateField id="d-start" value={current.startedAt} onCommit={(v) => change({ startedAt: v })} />
          </div>
          {current.status === "read" && (
            <>
              <div>
                <label className="label" htmlFor="d-finish">Terminei em</label>
                <DateField id="d-finish" value={current.finishedAt} onCommit={(v) => change({ finishedAt: v, ...(v ? { readYear: Number(v.slice(0, 4)) } : {}) })} />
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="d-year">Conta como leitura de</label>
                <YearSelect id="d-year" value={current.readYear ?? currentYear()} onChange={(y) => change({ readYear: y, ...(current.finishedAt && Number(current.finishedAt.slice(0, 4)) !== y ? { finishedAt: null } : {}) })} />
                <p className="mt-1 text-xs text-stone-500">Não lembra a data exata? Só o ano já basta para o histórico.</p>
              </div>
            </>
          )}
        </section>
      )}

      <section className="mt-6">
        <label className="label" htmlFor="d-review">Resenha</label>
        <textarea
          id="d-review"
          className="input min-h-32 resize-y py-3"
          placeholder="O que você achou? Só você vê."
          value={current.review ?? ""}
          onChange={(e) => change({ review: e.target.value || null })}
        />
      </section>

      {details.data?.description && (
        <section className="mt-6 fade-in">
          <span className="label">Sinopse</span>
          <p className={`text-sm leading-relaxed text-stone-600 dark:text-stone-300 ${showDesc ? "" : "line-clamp-4"}`}>{details.data.description}</p>
          <button type="button" onClick={() => setShowDesc((v) => !v)} className="mt-1 text-sm font-semibold text-accent-700 dark:text-accent-400">{showDesc ? "Mostrar menos" : "Ler mais"}</button>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-stone-400">
        {book.source === "manual" ? "Livro cadastrado manualmente" : `Dados e capa: ${SOURCE_LABEL[book.source]}`}
      </p>

      {dirty && (
        <div className="fade-in sticky bottom-24 z-20 mt-4 flex gap-2">
          <button type="button" onClick={save} disabled={update.isPending} className="btn-primary flex-1 shadow-lg">{update.isPending ? "Salvando…" : "Salvar"}</button>
          <button type="button" onClick={() => setDraft({})} disabled={update.isPending} className="btn-secondary shadow-lg">Cancelar</button>
        </div>
      )}

      {confirmRemove && (
        <Sheet title="Remover da estante" onClose={() => setConfirmRemove(false)}>
          <p className="text-sm text-stone-600 dark:text-stone-300">Remover “{book.title}” da sua estante? Nota, resenha e datas deste livro serão apagadas.</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirmRemove(false)} disabled={remove.isPending} className="btn-secondary flex-1">Cancelar</button>
            <button type="button" onClick={onRemove} disabled={remove.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">{remove.isPending ? "Removendo…" : "Remover"}</button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
