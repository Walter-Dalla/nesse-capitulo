import { useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../lib/api";
import { useAddToShelf, useMe, useProviders, useUpdateAnyItem } from "../lib/hooks";
import { AdGate } from "./AdGate";
import { currentYear, formatAuthors, today } from "../lib/format";
import { changedFields, type ItemDraft } from "../lib/itemDraft";
import { STATUS_ACTION, STATUS_LABEL, STATUS_ORDER, type BookInput, type ShelfItem, type Status } from "../lib/types";
import { BookCover } from "./BookCover";
import { DateField } from "./DateField";
import { IconCheck } from "./Icons";
import { Sheet } from "./Sheet";
import { Stars } from "./Stars";
import { toast } from "./Toast";
import { YearSelect } from "./YearSelect";

interface Props {
  book: BookInput;
  /** Vindo de "Por ano": ano pré-preenchido para quem marcar "Já li". */
  defaultYear?: number;
  /** `added` diz se o livro entrou na estante (quem abriu decide se sai do formulário). */
  onClose: (added: boolean) => void;
}

const PAGE_MAX = 100000;

/** Campo de página: vazio vira null; o resto, inteiro entre 0 e PAGE_MAX. */
function parsePage(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(PAGE_MAX, Math.max(0, n)) : null;
}

/**
 * Adicionar à estante em dois passos. Nada vem marcado: tocar em um status já cria o item
 * (POST). "Quero ler" não tem mais nada a preencher, então a folha fecha e um aviso oferece
 * "Ver livro". Os outros status abrem o passo 2 na mesma folha, com os campos opcionais daquele
 * status; "Concluir", "Ver livro" e fechar mandam o que foi preenchido num PATCH.
 */
export function AddSheet({ book, defaultYear, onClose }: Props) {
  const [item, setItem] = useState<ShelfItem | null>(null);
  const [picking, setPicking] = useState(true);
  const [draft, setDraft] = useState<ItemDraft>({});
  // status escolhido enquanto o anúncio recompensado não foi assistido
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const add = useAddToShelf();
  const update = useUpdateAnyItem();
  const navigate = useNavigate();
  const me = useMe();
  const providers = useProviders();
  const needsAd = Boolean(providers.data?.ads.enabled) && me.data?.adUnlocked === false;
  const busy = add.isPending || update.isPending;

  function openBook(id: string) {
    navigate(`/livro/${id}`);
  }

  async function pick(status: Status) {
    if (!item && needsAd) { setPendingStatus(status); return; }
    try {
      let saved: ShelfItem;
      if (item) {
        // "trocar": o item já existe; vai junto o que foi preenchido no passo 2 (ex.: nota), e o
        // servidor descarta o que não vale no novo status (página em Lido, datas em Quero ler)
        const patch = { ...changedFields(item, draft), status, ...(status === "reading" && !item.startedAt ? { startedAt: today() } : {}) };
        saved = Object.keys(changedFields(item, patch)).length ? (await update.mutateAsync({ id: item.id, patch })).item : item;
      } else {
        saved = (await add.mutateAsync({
          book,
          status,
          ...(status === "reading" ? { startedAt: today() } : {}),
          ...(status === "read" && defaultYear ? { readYear: defaultYear } : {}),
        })).item;
      }
      setItem(saved);
      setDraft({});
      if (status === "want") {
        toast(`Adicionado em “${STATUS_LABEL.want}”`, "info", { label: "Ver livro", onClick: () => openBook(saved.id) });
        onClose(true);
        return;
      }
      setPicking(false);
    } catch (e) {
      if (e instanceof ApiError && e.code === "AD_REQUIRED") { setPendingStatus(status); return; }
      toast((e as Error).message, "error");
    }
  }

  /** Passo 2: manda o que mudou (se mudou) e fecha; opcionalmente abre a tela do livro. */
  async function finish(open: boolean) {
    if (!item) { onClose(false); return; }
    const patch = changedFields(item, draft);
    try {
      if (Object.keys(patch).length) await update.mutateAsync({ id: item.id, patch });
      onClose(true);
      if (open) openBook(item.id);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (pendingStatus) {
    const status = pendingStatus;
    return <AdGate onClose={() => setPendingStatus(null)} onUnlocked={() => { setPendingStatus(null); void pick(status); }} />;
  }

  const change = (patch: ItemDraft) => setDraft({ ...draft, ...patch });
  const current = item ? { ...item, ...draft } : null;

  return (
    <Sheet title={item ? "Adicionado à estante" : "Adicionar à estante"} onClose={() => (picking ? onClose(Boolean(item)) : void finish(false))}>
      <div className="mb-4 flex gap-3">
        <BookCover book={book} className="w-12" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">{formatAuthors(book.authors)}</p>
          {item && !picking && (
            <button type="button" onClick={() => setPicking(true)} disabled={busy} className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-700/30 dark:text-accent-200">
              <IconCheck width={14} height={14} /> {STATUS_ACTION[item.status]}
              <span className="font-normal opacity-70">· trocar</span>
            </button>
          )}
        </div>
      </div>

      {picking ? (
        <>
          <span className="label">{item ? "Trocar o status" : "Como você quer guardar este livro?"}</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Status">
            {STATUS_ORDER.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={item?.status === s} disabled={busy} onClick={() => pick(s)} className={item?.status === s ? "btn-primary" : "btn-secondary"}>
                {STATUS_ACTION[s]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">
            {busy ? "Salvando…" : item ? "O livro continua na estante; só o status muda." : "Toque em um status para adicionar à estante."}
          </p>
        </>
      ) : current && (
        <>
          <span className="label">Quer completar? (opcional)</span>
          <div className="card fade-in grid grid-cols-2 gap-3 p-4">
            {current.status === "reading" && (
              <>
                <div>
                  <label className="label" htmlFor="add-start">Comecei em</label>
                  <DateField id="add-start" value={current.startedAt} onCommit={(v) => change({ startedAt: v })} />
                </div>
                <div>
                  <label className="label" htmlFor="add-page">Estou na página</label>
                  <input id="add-page" type="number" inputMode="numeric" min={0} max={PAGE_MAX} className="input" placeholder="0" value={current.currentPage ?? ""} onChange={(e) => change({ currentPage: parsePage(e.target.value) })} />
                </div>
              </>
            )}
            {current.status === "abandoned" && (
              <div className="col-span-2">
                <label className="label" htmlFor="add-page">Parei na página</label>
                <input id="add-page" type="number" inputMode="numeric" min={0} max={PAGE_MAX} className="input w-32" placeholder="0" value={current.currentPage ?? ""} onChange={(e) => change({ currentPage: parsePage(e.target.value) })} />
              </div>
            )}
            {current.status === "read" && (
              <>
                <div>
                  <label className="label" htmlFor="add-year">Ano da leitura</label>
                  <YearSelect id="add-year" value={current.readYear ?? currentYear()} onChange={(y) => change({ readYear: y, ...(current.finishedAt && Number(current.finishedAt.slice(0, 4)) !== y ? { finishedAt: null } : {}) })} />
                </div>
                <div>
                  <label className="label" htmlFor="add-date">Terminei em</label>
                  <DateField id="add-date" value={current.finishedAt} onCommit={(v) => change({ finishedAt: v, ...(v ? { readYear: Number(v.slice(0, 4)) } : {}) })} />
                </div>
                <div className="col-span-2">
                  <span className="label">Sua nota</span>
                  <Stars value={current.rating} onChange={(v) => change({ rating: v })} size="lg" />
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => finish(false)} disabled={busy} className="btn-primary flex-1">{update.isPending ? "Salvando…" : "Concluir"}</button>
            <button type="button" onClick={() => finish(true)} disabled={busy} className="btn-secondary flex-1">Ver livro</button>
          </div>
          <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-400">O livro já está na sua estante. Fechar também guarda o que você preencheu.</p>
        </>
      )}
    </Sheet>
  );
}
