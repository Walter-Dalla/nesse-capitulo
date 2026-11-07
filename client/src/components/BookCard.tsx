import { Link } from "react-router";
import { STATUS_ACTION, type ShelfItem } from "../lib/types";
import { formatAuthors, formatDate, friendsReadChip, pageProgressText, readingPercent } from "../lib/format";
import { useFriendBadges } from "../lib/hooks";
import { BookCover } from "./BookCover";
import { ProgressBar } from "./ProgressBar";
import { Stars } from "./Stars";

export function BookCard({ item, showStatus = false }: { item: ShelfItem; showStatus?: boolean }) {
  const { book } = item;
  // uma chamada só para todos os cartões: o React Query deduplica pela chave
  const friendsRead = useFriendBadges().data?.badges[item.id] ?? 0;
  const progress = item.status === "reading" ? readingPercent(item.currentPage, book.pageCount) : null;
  return (
    <Link to={`/livro/${item.id}`} className="card flex gap-3 p-3 transition active:scale-[0.99] hover:ring-accent-200 dark:hover:ring-stone-700">
      <BookCover book={book} className="w-14" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
        <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{formatAuthors(book.authors)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
          {showStatus && <span className="font-semibold">{STATUS_ACTION[item.status]}</span>}
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
  );
}
