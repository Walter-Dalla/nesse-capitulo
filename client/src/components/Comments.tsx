import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { displayName, formatTimestamp } from "../lib/format";
import { useAddComment, useComments, useRemoveComment, useUpdateComment } from "../lib/hooks";
import { t, type MessageKey } from "../lib/i18n";
import { VISIBILITY_LABEL, type BookComment, type CommentVisibility } from "../lib/types";
import { Avatar } from "./FriendBadge";
import { ReportSheet } from "./ReportSheet";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const MAX = 2000;
const HINT: Record<CommentVisibility, MessageKey> = {
  private: "social.comments.hintPrivate",
  public: "social.comments.hintPublic",
};

function VisibilityPicker({ value, onChange, disabled }: { value: CommentVisibility; onChange: (v: CommentVisibility) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t("social.comments.whoSees")}>
      {(["private", "public"] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)} className={value === v ? "chip-on" : "chip-off"}>
          {VISIBILITY_LABEL[v]}
        </button>
      ))}
    </div>
  );
}

function VisibilityTag({ visibility }: { visibility: CommentVisibility }) {
  const cls = visibility === "public"
    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200"
    : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300";
  return <span className={`rounded-md px-1.5 py-0.5 font-semibold ${cls}`}>{VISIBILITY_LABEL[visibility]}</span>;
}

/** Comentários de um livro da minha estante: os meus (privados ou públicos) e os públicos de amigos. */
export function Comments({ itemId }: { itemId: string }) {
  const query = useComments(itemId);
  const add = useAddComment(itemId);
  const update = useUpdateComment(itemId);
  const remove = useRemoveComment(itemId);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<CommentVisibility>("private");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [deleting, setDeleting] = useState<BookComment | null>(null);
  // id do comentário de amigo sendo denunciado; os meus nunca têm "Denunciar"
  const [reporting, setReporting] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await add.mutateAsync({ body: text, visibility });
      setBody("");
      toast(visibility === "public" ? t("social.comments.published") : t("social.comments.saved"));
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const text = editing.body.trim();
    if (!text) return;
    try {
      await update.mutateAsync({ id: editing.id, body: text });
      setEditing(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function toggle(c: BookComment) {
    const next: CommentVisibility = c.visibility === "public" ? "private" : "public";
    try {
      await update.mutateAsync({ id: c.id, visibility: next });
      toast(next === "public" ? t("social.comments.nowPublic") : t("social.comments.nowPrivate"));
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast(t("social.comments.deleted"));
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDeleting(null);
    }
  }

  const mine = query.data?.comments ?? [];
  const friends = query.data?.friends ?? [];

  return (
    <section className="mt-6">
      <span className="label">{t("social.comments.title")}</span>
      <form onSubmit={submit} className="card space-y-3 p-3">
        <textarea
          aria-label={t("social.comments.new")}
          className="input min-h-20 resize-y py-2.5"
          placeholder={t("social.comments.placeholder")}
          maxLength={MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityPicker value={visibility} onChange={setVisibility} disabled={add.isPending} />
          <button type="submit" disabled={add.isPending || !body.trim()} className="btn-primary ml-auto">{add.isPending ? t("social.comments.saving") : t("social.comments.submit")}</button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t(HINT[visibility])}</p>
      </form>

      {query.isError && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{t("social.comments.loadError")}</p>}

      {mine.length > 0 && (
        <ul className="mt-3 space-y-2">
          {mine.map((c) => (
            <li key={c.id} className="card p-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                <VisibilityTag visibility={c.visibility} />
                <span>{formatTimestamp(c.createdAt)}</span>
              </div>
              {editing?.id === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea aria-label={t("social.comments.editLabel")} className="input min-h-20 resize-y py-2.5" maxLength={MAX} value={editing.body} onChange={(e) => setEditing({ id: c.id, body: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} disabled={update.isPending || !editing.body.trim()} className="btn-primary flex-1">{t("base.save")}</button>
                    <button type="button" onClick={() => setEditing(null)} disabled={update.isPending} className="btn-secondary">{t("base.cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                  <div className="mt-2 flex justify-end gap-3 text-xs font-semibold text-accent-700 dark:text-accent-400">
                    <button type="button" onClick={() => toggle(c)} disabled={update.isPending}>{c.visibility === "public" ? t("social.comments.makePrivate") : t("social.comments.makePublic")}</button>
                    <button type="button" onClick={() => setEditing({ id: c.id, body: c.body })}>{t("social.comments.edit")}</button>
                    <button type="button" onClick={() => setDeleting(c)} className="text-red-700 dark:text-red-300">{t("social.comments.delete")}</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {friends.length > 0 && (
        <div className="mt-5">
          <span className="label">{t("social.comments.friends")}</span>
          <ul className="space-y-2">
            {friends.map((c) => (
              <li key={c.id} className="card flex gap-3 p-3 text-sm">
                <Link to={`/amigos/${c.author.id}`} aria-hidden tabIndex={-1}><Avatar user={c.author} size="sm" /></Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    <Link to={`/amigos/${c.author.id}`} className="font-semibold text-stone-700 hover:underline dark:text-stone-200">{displayName(c.author)}</Link>
                    {" · "}{formatTimestamp(c.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                  <div className="mt-1.5 flex justify-end">
                    <button type="button" onClick={() => setReporting(c.id)} className="text-xs font-semibold text-stone-500 hover:underline dark:text-stone-400">{t("social.report.action")}</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reporting && <ReportSheet target={{ commentId: reporting }} onClose={() => setReporting(null)} />}

      {deleting && (
        <Sheet title={t("social.comments.deleteTitle")} onClose={() => setDeleting(null)}>
          <p className="line-clamp-4 text-sm text-stone-600 dark:text-stone-300">“{deleting.body}”</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setDeleting(null)} disabled={remove.isPending} className="btn-secondary flex-1">{t("base.cancel")}</button>
            <button type="button" onClick={confirmDelete} disabled={remove.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">{remove.isPending ? t("social.comments.deleting") : t("social.comments.delete")}</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
