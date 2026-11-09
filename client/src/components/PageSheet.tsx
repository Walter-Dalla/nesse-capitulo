import { useState } from "react";
import { useUpdateItem } from "../lib/hooks";
import { readingPercent, today } from "../lib/format";
import type { ShelfItem } from "../lib/types";
import { ProgressBar } from "./ProgressBar";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const PAGE_MAX = 100000;
const STEP = 10;

const clamp = (n: number) => Math.min(PAGE_MAX, Math.max(0, Math.floor(n)));

/**
 * Atualização rápida da página atual a partir do cartão (sem abrir o livro): número grande,
 * −10/+10, e "Terminei o livro", que marca como Lido com a data de hoje.
 */
export function PageSheet({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
  const [page, setPage] = useState<number>(item.currentPage ?? 0);
  const update = useUpdateItem(item.id);
  const total = item.book.pageCount;
  const percent = readingPercent(page, total);

  async function save() {
    try {
      await update.mutateAsync({ currentPage: page });
      toast(`Página ${page} salva`);
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function finish() {
    try {
      const res = await update.mutateAsync({ status: "read", finishedAt: today() });
      toast(`Marcado como lido em ${res.item.readYear}`);
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Sheet title={item.book.title} onClose={onClose}>
      <p className="-mt-3 text-sm text-stone-500 dark:text-stone-400">Em que página você está?</p>
      <div className="mt-4 flex items-center gap-2.5">
        <button type="button" onClick={() => setPage((p) => clamp(p - STEP))} disabled={update.isPending || page === 0} className="btn-secondary min-w-14 px-0" aria-label={`Menos ${STEP} páginas`}>−{STEP}</button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={PAGE_MAX}
          aria-label="Página atual"
          className="input !min-h-13 flex-1 text-center text-2xl font-bold tabular-nums"
          value={page}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setPage(e.target.value === "" ? 0 : clamp(Number(e.target.value) || 0))}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
        />
        <button type="button" onClick={() => setPage((p) => clamp(p + STEP))} disabled={update.isPending} className="btn-secondary min-w-14 px-0" aria-label={`Mais ${STEP} páginas`}>+{STEP}</button>
      </div>
      <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">
        {total ? `de ${total}` : "sem total de páginas"}
        {percent !== null && <span className="ml-2 font-semibold text-stone-700 dark:text-stone-200">{percent}%</span>}
      </p>
      {percent !== null && <ProgressBar percent={percent} className="mt-2" />}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={finish} disabled={update.isPending} className="btn-secondary flex-1">Terminei o livro</button>
        <button type="button" onClick={save} disabled={update.isPending || page === (item.currentPage ?? 0)} className="btn-primary flex-1">{update.isPending ? "Salvando…" : "Salvar"}</button>
      </div>
    </Sheet>
  );
}
