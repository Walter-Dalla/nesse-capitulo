import { Link } from "react-router";
import { STATUS_ACTION, type ShelfItem } from "../lib/types";
import { formatAuthors, formatDate } from "../lib/format";
import { BookCover } from "./BookCover";
import { Stars } from "./Stars";

export function BookCard({ item, showStatus = false }: { item: ShelfItem; showStatus?: boolean }) {
  const { book } = item;
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
          {book.pageCount ? <span>{book.pageCount} pág.</span> : null}
        </div>
        {item.review && <p className="mt-1.5 line-clamp-2 text-xs italic text-stone-500 dark:text-stone-400">“{item.review}”</p>}
      </div>
    </Link>
  );
}
