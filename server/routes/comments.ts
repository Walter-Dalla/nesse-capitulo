import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { DB } from "../db.js";
import { COMMENT_VISIBILITIES, type AppEnv, type BookComment, type CommentVisibility, type FriendComment } from "../types.js";
import { ValidationError, optStr } from "../validate.js";
import { MY_FRIENDS, rowToPublicComment } from "./friends.js";
import { getItem } from "./shelf.js";
import { hasAcceptedTerms, TERMS_REQUIRED } from "../terms.js";

export const COMMENT_MAX = 2000;
const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };

const SELECT_COMMENT = "SELECT id, body, visibility, created_at, updated_at FROM book_comments";

/**
 * Comentários públicos de amigos sobre o mesmo livro do meu item `?2`: mesmo book_id ou mesmo ISBN,
 * em qualquer status da estante deles (quem deixou público quis mostrar). UNION pelo mesmo motivo do selo.
 * O comentário que eu denunciei some só para mim.
 */
const FRIEND_COMMENTS_SQL = `WITH ${MY_FRIENDS},
mine AS (
  SELECT mb.id AS book_id, upper(mb.isbn13) AS isbn
  FROM user_books me JOIN books mb ON mb.id = me.book_id
  WHERE me.user_id = ?1 AND me.id = ?2
),
items AS (
  SELECT fub.id
  FROM mine m
  JOIN user_books fub ON fub.book_id = m.book_id
  JOIN my_friends f ON f.id = fub.user_id
  UNION
  SELECT fub.id
  FROM mine m
  JOIN books fb ON upper(fb.isbn13) = m.isbn AND fb.isbn13 IS NOT NULL
  JOIN user_books fub ON fub.book_id = fb.id
  JOIN my_friends f ON f.id = fub.user_id
  WHERE m.isbn IS NOT NULL
)
SELECT c.id, c.body, c.created_at, c.updated_at, u.id AS u_id, u.name AS u_name, u.picture AS u_picture
FROM items i
JOIN book_comments c ON c.item_id = i.id AND c.visibility = 'public'
JOIN users u ON u.id = c.user_id
WHERE NOT EXISTS (SELECT 1 FROM content_reports r WHERE r.comment_id = c.id AND r.reporter_id = ?1)
ORDER BY c.created_at DESC, c.rowid DESC`;

function rowToComment(r: any): BookComment {
  return { ...rowToPublicComment(r), visibility: r.visibility };
}

function parseVisibility(v: unknown): CommentVisibility {
  if (typeof v !== "string" || !COMMENT_VISIBILITIES.includes(v as CommentVisibility)) {
    throw new ValidationError(`visibility deve ser um de: ${COMMENT_VISIBILITIES.join(", ")}`);
  }
  return v as CommentVisibility;
}

function parseBody(v: unknown): string {
  const body = optStr(v, "body", COMMENT_MAX);
  if (!body) throw new ValidationError("Escreva o comentário", "COMMENT_EMPTY");
  return body;
}

function findMyComment(db: DB, userId: string, id: string): BookComment | null {
  const row = db.prepare(`${SELECT_COMMENT} WHERE id = ? AND user_id = ?`).get(id, userId);
  return row ? rowToComment(row) : null;
}

export function commentsRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message, code: err.code }, 400);
    console.error(err);
    return c.json({ error: "Erro interno", code: "INTERNAL" }, 500);
  });

  // meus comentários (privados e públicos) e os públicos de amigos sobre o mesmo livro
  app.get("/api/shelf/:id/comments", (c) => {
    const me = c.var.user.id;
    const id = c.req.param("id");
    if (!getItem(db, me, id)) return c.json(NOT_FOUND, 404);
    const comments = db
      .prepare(`${SELECT_COMMENT} WHERE item_id = ? AND user_id = ? ORDER BY created_at DESC, rowid DESC`)
      .all(id, me)
      .map(rowToComment);
    const friends: FriendComment[] = (db.prepare(FRIEND_COMMENTS_SQL).all(me, id) as any[]).map((r) => ({
      ...rowToPublicComment(r),
      author: { id: r.u_id, name: r.u_name, picture: r.u_picture },
    }));
    return c.json({ comments, friends });
  });

  // novo comentário num livro da minha estante; privado se a visibilidade não vier
  app.post("/api/shelf/:id/comments", async (c) => {
    const me = c.var.user.id;
    const itemId = c.req.param("id");
    if (!getItem(db, me, itemId)) return c.json(NOT_FOUND, 404);
    const input = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const body = parseBody(input.body);
    const visibility = input.visibility === undefined ? "private" : parseVisibility(input.visibility);
    if (visibility === "public" && !hasAcceptedTerms(c.var.user)) return c.json(TERMS_REQUIRED, 403);
    const id = randomUUID();
    db.prepare("INSERT INTO book_comments (id, item_id, user_id, body, visibility) VALUES (?, ?, ?, ?, ?)").run(id, itemId, me, body, visibility);
    return c.json({ comment: findMyComment(db, me, id) }, 201);
  });

  // editar texto e/ou visibilidade de um comentário meu
  app.patch("/api/comments/:id", async (c) => {
    const me = c.var.user.id;
    const current = findMyComment(db, me, c.req.param("id"));
    if (!current) return c.json(NOT_FOUND, 404);
    const input = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const has = (k: string) => Object.prototype.hasOwnProperty.call(input, k);
    const body = has("body") ? parseBody(input.body) : current.body;
    const visibility = has("visibility") ? parseVisibility(input.visibility) : current.visibility;
    if (visibility === "public" && !hasAcceptedTerms(c.var.user)) return c.json(TERMS_REQUIRED, 403);
    db.prepare("UPDATE book_comments SET body = ?, visibility = ?, updated_at = datetime('now') WHERE id = ?").run(body, visibility, current.id);
    return c.json({ comment: findMyComment(db, me, current.id) });
  });

  app.delete("/api/comments/:id", (c) => {
    const info = db.prepare("DELETE FROM book_comments WHERE id = ? AND user_id = ?").run(c.req.param("id"), c.var.user.id);
    return info.changes ? c.json({ ok: true }) : c.json(NOT_FOUND, 404);
  });

  return app;
}
