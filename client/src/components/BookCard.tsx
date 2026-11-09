import { useState } from "react";
import { Link } from "react-router";
import { STATUS_BADGE, type ShelfItem, type Status } from "../lib/types";
import { formatAuthors, formatDate, friendsReadChip, pageProgressText, readingPercent, updatedAgoText } from "../lib/format";
import { useFriendBadges } from "../lib/hooks";
import { BookCover } from "./BookCover";
import { IconPlus } from "./Icons";
import { PageSheet } from "./PageSheet";
import { ProgressBar } from "./ProgressBar";
import { Stars } from "./Stars";

/** Selo de status com a cor de cada lista; o mesmo rótulo dos filtros, no singular. */
const BADGE_CLASS: Record<Status, string> = {
  reading: "bg-accent-100 text-accent-700 dark:bg-accent-700/30 dark:text-accent-200",
  want: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  read: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  abandoned: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export function BookCard({ item, showStatus = false }: { item: ShelfItem; showStatus?: boolean }) {
  const { book } = item;
  // uma chamada só para todos os cartões: o React Query deduplica pela chave
  const friendsRead = useFriendBadges().data?.badges[item.id] ?? 0;
  const progress = item.status === "reading" ? readingPercent(item.currentPage, book.pageCount) : null;
  // atualização rápida da página, sem abrir o livro (o botão fica fora do link: link não pode conter botão)
  const [editPage, setEditPage] = useState(false);
  return (
    <div className="card p-3 transition hover:ring-accent-200 dark:hover:ring-stone-700">
      <Link to={`/livro/${item.id}`} className="flex gap-3 transition active:scale-[0.99]">
        <BookCover book={book} className="w-14" />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
          <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{formatAuthors(book.authors)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            {showStatus && <span className={`rounded-md px-1.5 py-0.5 font-semibold ${BADGE_CLASS[item.status]}`}>{STATUS_BADGE[item.status]}</span>}
            {item.rating ? <Stars value={item.rating} size="sm" /> : null}
            {item.status === "read" && item.readYear && (
              <span className="rounded-md bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-700 dark:bg-accent-700/30 dark:text-accent-200">
                {item.finishedAt ? formatDate(item.finishedAt) : item.readYear}
              </span>
            )}
            {item.status === "reading" && item.startedAt && <span>Desde {formatDate(item.startedAt)}</span>}
            {item.status === "reading" && item.currentPage != null ? (
              <span>{pageProgressText(item.currentPage, book.pageCount)}</span>
            ) : item.status === "abandoned" && item.currentPage != null ? (
              <span>Parei na pág. {item.currentPage}</span>
            ) : book.pageCount ? <span>{book.pageCount} pág.</span> : null}
            {friendsRead > 0 && (
              <span className="rounded-md bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                {friendsReadChip(friendsRead)}
              </span>
            )}
          </div>
          {progress !== null && <ProgressBar percent={progress} className="mt-2" />}
          {item.review && <p className="mt-1.5 line-clamp-2 text-xs italic text-stone-500 dark:text-stone-400">“{item.review}”</p>}
        </div>
      </Link>

      {item.status === "reading" && (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-stone-800">
          <span className="truncate text-xs text-stone-500 dark:text-stone-400">{updatedAgoText(item.updatedAt)}</span>
          <button type="button" onClick={() => setEditPage(true)} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-stone-100 px-3 text-xs font-semibold text-stone-800 transition hover:bg-stone-200 active:scale-[0.98] dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700">
            <IconPlus width={14} height={14} /> Página
          </button>
        </div>
      )}

      {editPage && <PageSheet item={item} onClose={() => setEditPage(false)} />}
    </div>
  );
}
