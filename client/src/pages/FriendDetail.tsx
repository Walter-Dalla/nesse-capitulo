import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { BookCover } from "../components/BookCover";
import { Avatar } from "../components/FriendBadge";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { Sheet } from "../components/Sheet";
import { toast } from "../components/Toast";
import { ProgressBar } from "../components/ProgressBar";
import { displayName, formatAuthors, formatTimestamp, pageProgressText, readingPercent } from "../lib/format";
import { useFriendShelf, useRemoveFriend } from "../lib/hooks";
import { t, tp } from "../lib/i18n";
import type { FriendShelfItem } from "../lib/types";

/** Livro de um amigo: sem link para /livro/:id (não é meu item), sem nota, resenha ou datas; só comentários públicos. */
function FriendBookRow({ item }: { item: FriendShelfItem }) {
  const { book } = item;
  const percent = item.status === "reading" ? readingPercent(item.currentPage, book.pageCount) : null;
  return (
    <li className="card p-3">
      <div className="flex gap-3">
        <BookCover book={book} className="w-12" />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="line-clamp-2 font-semibold leading-snug">{book.title}</p>
          <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{formatAuthors(book.authors)}</p>
          {item.status === "read" && item.readYear && (
            <span className="mt-2 inline-block rounded-md bg-accent-100 px-1.5 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-700/30 dark:text-accent-200">
              {item.readYear}
            </span>
          )}
          {item.status === "reading" && item.currentPage != null && (
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{pageProgressText(item.currentPage, book.pageCount)}</p>
          )}
          {percent !== null && <ProgressBar percent={percent} className="mt-1.5" />}
        </div>
      </div>
      {item.comments.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          {item.comments.map((c) => (
            <li key={c.id} className="text-sm">
              <p className="whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{formatTimestamp(c.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function FriendDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const query = useFriendShelf(id);
  const remove = useRemoveFriend();
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function onRemove() {
    try {
      await remove.mutateAsync(id);
      toast(t("social.friend.removed"));
      navigate("/amigos", { replace: true });
    } catch (e) {
      setConfirmRemove(false);
      toast((e as Error).message, "error");
    }
  }

  if (query.isPending) return <Page><Spinner /></Page>;
  if (query.isError) return <Page><ErrorBox error={query.error} /></Page>;

  const { friend, items } = query.data;
  const name = displayName(friend);
  const reading = items.filter((i) => i.status === "reading");
  // mais recentes primeiro; o servidor já ordena por atualização dentro do mesmo ano
  const read = items.filter((i) => i.status === "read").sort((a, b) => (b.readYear ?? 0) - (a.readYear ?? 0));

  return (
    <Page>
      <section className="flex items-center gap-4">
        <Avatar user={friend} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{name}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">{tp("social.friend.counts", read.length, { reading: reading.length })}</p>
        </div>
      </section>

      {items.length === 0 ? (
        <Empty title={t("social.friend.empty")} hint={t("social.friend.emptyHint", { name })} />
      ) : (
        <>
          {reading.length > 0 && (
            <section className="mt-6">
              <h2 className="label">{t("base.status.label.reading")}</h2>
              <ul className="space-y-3">{reading.map((i) => <FriendBookRow key={i.book.id} item={i} />)}</ul>
            </section>
          )}
          {read.length > 0 && (
            <section className="mt-6">
              <h2 className="label">{t("base.status.label.read")}</h2>
              <ul className="space-y-3">{read.map((i) => <FriendBookRow key={i.book.id} item={i} />)}</ul>
            </section>
          )}
        </>
      )}

      <section className="mt-8 pb-4">
        <button type="button" onClick={() => setConfirmRemove(true)} className="btn-danger w-full">{t("social.friend.remove")}</button>
      </section>

      {confirmRemove && (
        <Sheet title={t("social.friend.remove")} onClose={() => setConfirmRemove(false)}>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {t("social.friend.removeConfirm", { name })}
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirmRemove(false)} disabled={remove.isPending} className="btn-secondary flex-1">{t("base.cancel")}</button>
            <button type="button" onClick={onRemove} disabled={remove.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">
              {remove.isPending ? t("social.friend.removing") : t("social.friend.removeAction")}
            </button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
