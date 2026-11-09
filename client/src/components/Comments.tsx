import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { displayName, formatTimestamp } from "../lib/format";
import { useAddComment, useComments, useRemoveComment, useUpdateComment } from "../lib/hooks";
import { VISIBILITY_LABEL, type BookComment, type CommentVisibility } from "../lib/types";
import { Avatar } from "./FriendBadge";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const MAX = 2000;
const HINT: Record<CommentVisibility, string> = {
  private: "Só você vê.",
  public: "Seus amigos veem.",
};

function VisibilityPicker({ value, onChange, disabled }: { value: CommentVisibility; onChange: (v: CommentVisibility) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Quem vê o comentário">
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

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await add.mutateAsync({ body: text, visibility });
      setBody("");
      toast(visibility === "public" ? "Comentário publicado para amigos" : "Comentário salvo");
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
      toast(next === "public" ? "Agora seus amigos veem" : "Agora só você vê");
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast("Comentário apagado");
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
      <span className="label">Comentários</span>
      <form onSubmit={submit} className="card space-y-3 p-3">
        <textarea
          aria-label="Novo comentário"
          className="input min-h-20 resize-y py-2.5"
          placeholder="Uma ideia, um trecho, o que achou deste capítulo…"
          maxLength={MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityPicker value={visibility} onChange={setVisibility} disabled={add.isPending} />
          <button type="submit" disabled={add.isPending || !body.trim()} className="btn-primary ml-auto">{add.isPending ? "Salvando…" : "Comentar"}</button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{HINT[visibility]}</p>
      </form>

      {query.isError && <p className="mt-3 text-sm text-red-700 dark:text-red-300">Não foi possível carregar os comentários.</p>}

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
                  <textarea aria-label="Editar comentário" className="input min-h-20 resize-y py-2.5" maxLength={MAX} value={editing.body} onChange={(e) => setEditing({ id: c.id, body: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} disabled={update.isPending || !editing.body.trim()} className="btn-primary flex-1">Salvar</button>
                    <button type="button" onClick={() => setEditing(null)} disabled={update.isPending} className="btn-secondary">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                  <div className="mt-2 flex justify-end gap-3 text-xs font-semibold text-accent-700 dark:text-accent-400">
                    <button type="button" onClick={() => toggle(c)} disabled={update.isPending}>{c.visibility === "public" ? "Tornar privado" : "Tornar público"}</button>
                    <button type="button" onClick={() => setEditing({ id: c.id, body: c.body })}>Editar</button>
                    <button type="button" onClick={() => setDeleting(c)} className="text-red-700 dark:text-red-300">Apagar</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {friends.length > 0 && (
        <div className="mt-5">
          <span className="label">Comentários de amigos</span>
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
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deleting && (
        <Sheet title="Apagar comentário" onClose={() => setDeleting(null)}>
          <p className="line-clamp-4 text-sm text-stone-600 dark:text-stone-300">“{deleting.body}”</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setDeleting(null)} disabled={remove.isPending} className="btn-secondary flex-1">Cancelar</button>
            <button type="button" onClick={confirmDelete} disabled={remove.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">{remove.isPending ? "Apagando…" : "Apagar"}</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
