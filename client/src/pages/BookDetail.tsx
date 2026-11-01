import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BookCover } from "../components/BookCover";
import { IconTrash } from "../components/Icons";
import { ErrorBox, Page, Spinner } from "../components/Layout";
import { Stars } from "../components/Stars";
import { toast } from "../components/Toast";
import { YearSelect } from "../components/YearSelect";
import { useDetails, useItem, useRemoveItem, useUpdateItem } from "../lib/hooks";
import { currentYear, formatAuthors, today } from "../lib/format";
import { SOURCE_LABEL, STATUS_ACTION, STATUS_ORDER, type ShelfPatch } from "../lib/types";

export function BookDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useItem(id);
  const update = useUpdateItem(id);
  const remove = useRemoveItem();
  const item = query.data?.item;

  const [review, setReview] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  // sinopse vem sob demanda da fonte externa; não é gravada no banco
  const details = useDetails(id, Boolean(item) && item?.book.source !== "manual");
  useEffect(() => { if (item) setReview(item.review ?? ""); }, [item?.id, item?.review]);

  async function save(patch: ShelfPatch, msg?: string) {
    try {
      await update.mutateAsync(patch);
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function onRemove() {
    if (!item || !confirm(`Remover “${item.book.title}” da sua estante?`)) return;
    try {
      await remove.mutateAsync(item.id);
      toast("Removido da estante");
      navigate("/", { replace: true });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (query.isPending) return <Page back><Spinner /></Page>;
  if (query.isError || !item) return <Page back><ErrorBox error={query.error ?? new Error("Livro não encontrado")} /></Page>;

  const { book } = item;
  const reviewDirty = review !== (item.review ?? "");

  return (
    <Page back action={<button type="button" onClick={onRemove} className="rounded-xl p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" aria-label="Remover da estante"><IconTrash /></button>}>
      <section className="flex gap-4">
        <BookCover book={book} size="L" className="w-28" />
        <div className="min-w-0 flex-1 py-1">
          <h1 className="text-xl font-bold leading-tight">{book.title}</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-300">{formatAuthors(book.authors)}</p>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            {[book.publishedYear, book.pageCount ? `${book.pageCount} páginas` : null, book.isbn13 ? `ISBN ${book.isbn13}` : null].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3">
            <Stars value={item.rating} onChange={(v) => save({ rating: v })} size="lg" />
          </div>
        </div>
      </section>

      <section className="mt-6">
        <span className="label">Status</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status">
          {STATUS_ORDER.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={item.status === s} disabled={update.isPending} onClick={() => item.status !== s && save({ status: s })} className={item.status === s ? "btn-primary" : "btn-secondary"}>
              {STATUS_ACTION[s]}
            </button>
          ))}
        </div>
      </section>

      {item.status !== "want" && (
        <section className="card fade-in mt-4 grid grid-cols-2 gap-3 p-4">
          <div className={item.status === "read" ? "" : "col-span-2"}>
            <label className="label" htmlFor="d-start">Comecei em</label>
            <input id="d-start" type="date" className="input" value={item.startedAt ?? ""} max={today()} onChange={(e) => save({ startedAt: e.target.value || null })} />
          </div>
          {item.status === "read" && (
            <>
              <div>
                <label className="label" htmlFor="d-finish">Terminei em</label>
                <input id="d-finish" type="date" className="input" value={item.finishedAt ?? ""} max={today()} onChange={(e) => save({ finishedAt: e.target.value || null })} />
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="d-year">Conta como leitura de</label>
                <YearSelect id="d-year" value={item.readYear ?? currentYear()} onChange={(y) => save({ readYear: y }, `Movido para ${y}`)} />
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
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />
        {reviewDirty && (
          <div className="fade-in mt-2 flex gap-2">
            <button type="button" onClick={() => save({ review: review || null }, "Resenha salva")} disabled={update.isPending} className="btn-primary flex-1">Salvar resenha</button>
            <button type="button" onClick={() => setReview(item.review ?? "")} className="btn-secondary">Cancelar</button>
          </div>
        )}
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
    </Page>
  );
}
