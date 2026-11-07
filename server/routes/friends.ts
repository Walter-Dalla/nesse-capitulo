import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { transaction, type DB } from "../db.js";
import type { AppEnv, FriendBook, FriendShelfItem, FriendSummary, FriendUser, PublicComment } from "../types.js";
import { getItem, rowToBook } from "./shelf.js";

const INVALID_INVITE = { error: "Convite inválido ou já usado" };
const SELF_INVITE = { error: "Este convite é seu", code: "INVITE_SELF" };
const NOT_FOUND = { error: "Não encontrado" };

/** CTE com os ids dos amigos de `?1`. A amizade é guardada uma vez por par (user_low < user_high). */
export const MY_FRIENDS = `my_friends(id) AS (
  SELECT user_high FROM friendships WHERE user_low = ?1
  UNION ALL
  SELECT user_low FROM friendships WHERE user_high = ?1
)`;

/**
 * Colunas que um amigo pode ver: status, ano de leitura e o livro sem sinopse.
 * Nunca use SELECT_ITEM/rowToItem aqui: trazem nota, resenha e datas.
 */
const FRIEND_BOOK_COLS = `ub.id AS item_id, ub.status AS status, ub.read_year AS read_year, ub.current_page AS current_page,
  b.id AS b_id, b.source AS b_source, b.source_id AS b_source_id, b.title AS b_title,
  b.authors AS b_authors, b.page_count AS b_page_count,
  b.published_year AS b_published_year, b.isbn13 AS b_isbn13, b.cover_ref AS b_cover_ref`;

/**
 * Badge em lote: quantos amigos já leram cada item da minha estante.
 * Mesmo livro = mesmo book_id ou mesmo ISBN (sem diferenciar x/X).
 * O UNION (em vez de OR) deixa cada lado usar o seu índice: idx_user_books_book e idx_books_isbn_upper.
 */
export const BADGES_SQL = `WITH ${MY_FRIENDS},
mine AS (
  SELECT me.id AS item_id, mb.id AS book_id, upper(mb.isbn13) AS isbn
  FROM user_books me JOIN books mb ON mb.id = me.book_id
  WHERE me.user_id = ?1
),
hits AS (
  SELECT m.item_id, fub.user_id
  FROM mine m
  JOIN user_books fub ON fub.book_id = m.book_id AND fub.status = 'read'
  JOIN my_friends f ON f.id = fub.user_id
  UNION
  SELECT m.item_id, fub.user_id
  FROM mine m
  JOIN books fb ON upper(fb.isbn13) = m.isbn AND fb.isbn13 IS NOT NULL
  JOIN user_books fub ON fub.book_id = fb.id AND fub.status = 'read'
  JOIN my_friends f ON f.id = fub.user_id
  WHERE m.isbn IS NOT NULL
)
SELECT item_id AS itemId, COUNT(*) AS count FROM hits GROUP BY item_id`;

/** Mesma lógica do lote, restrita a um item meu (`?2`): devolve os amigos, sem repetir. */
const BOOK_FRIENDS_SQL = `WITH ${MY_FRIENDS},
mine AS (
  SELECT mb.id AS book_id, upper(mb.isbn13) AS isbn
  FROM user_books me JOIN books mb ON mb.id = me.book_id
  WHERE me.user_id = ?1 AND me.id = ?2
),
hits AS (
  SELECT fub.user_id
  FROM mine m
  JOIN user_books fub ON fub.book_id = m.book_id AND fub.status = 'read'
  JOIN my_friends f ON f.id = fub.user_id
  UNION
  SELECT fub.user_id
  FROM mine m
  JOIN books fb ON upper(fb.isbn13) = m.isbn AND fb.isbn13 IS NOT NULL
  JOIN user_books fub ON fub.book_id = fb.id AND fub.status = 'read'
  JOIN my_friends f ON f.id = fub.user_id
  WHERE m.isbn IS NOT NULL
)
SELECT u.id, u.name, u.picture
FROM hits h JOIN users u ON u.id = h.user_id
ORDER BY u.name IS NULL, u.name COLLATE NOCASE, u.id`;

/** Par canônico da tabela friendships. */
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function areFriends(db: DB, a: string, b: string): boolean {
  if (a === b) return false;
  const [low, high] = pair(a, b);
  return !!db.prepare("SELECT 1 FROM friendships WHERE user_low = ? AND user_high = ?").get(low, high);
}

function findFriendUser(db: DB, id: string): FriendUser | null {
  const row = db.prepare("SELECT id, name, picture FROM users WHERE id = ?").get(id) as FriendUser | undefined;
  return row ? { id: row.id, name: row.name, picture: row.picture } : null;
}

export function rowToPublicComment(r: any): PublicComment {
  return { id: r.id, body: r.body, createdAt: r.created_at, updatedAt: r.updated_at };
}

function rowToFriendBook(r: any): FriendBook {
  return { status: r.status, readYear: r.read_year, currentPage: r.current_page, book: rowToBook(r) };
}

type InviteState =
  | { state: "invalid" }
  | { state: "self" }
  | { state: "already"; inviter: FriendUser }
  | { state: "open"; inviter: FriendUser };

/**
 * Estado de um convite para quem o abre. Única fonte de verdade do GET e do accept,
 * para a prévia nunca divergir do que o toque em "confirmar" faria.
 */
export function resolveInvite(db: DB, code: string, me: string): InviteState {
  const row = db
    .prepare(
      `SELECT fi.inviter_id, fi.used_by, u.name, u.picture
       FROM friend_invites fi JOIN users u ON u.id = fi.inviter_id
       WHERE fi.code = ?`,
    )
    .get(code) as { inviter_id: string; used_by: string | null; name: string | null; picture: string | null } | undefined;
  // 1. inexistente (convites não expiram)
  if (!row) return { state: "invalid" };
  // 2. o convite é meu
  if (row.inviter_id === me) return { state: "self" };
  const inviter: FriendUser = { id: row.inviter_id, name: row.name, picture: row.picture };
  const friends = areFriends(db, me, row.inviter_id);
  // 3. eu já usei: vale enquanto a amizade existir (toque duplo, repetição após queda de rede); desfeita, não refaz
  if (row.used_by === me) return friends ? { state: "already", inviter } : { state: "invalid" };
  // 4. outra pessoa usou
  if (row.used_by !== null) return { state: "invalid" };
  // 5. já somos amigos por outro caminho: não consome
  if (friends) return { state: "already", inviter };
  // 6. aberto
  return { state: "open", inviter };
}

export function friendsRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  // gera um link de convite novo: uso único e sem validade; vários convites abertos convivem
  app.post("/api/friends/invites", (c) => {
    const code = randomBytes(16).toString("base64url");
    db.prepare("INSERT INTO friend_invites (code, inviter_id) VALUES (?, ?)").run(code, c.var.user.id);
    return c.json({ code }, 201);
  });

  // prévia do convite: quem convidou. Nunca escreve no banco (prévia de link, recarregar, "Agora não").
  app.get("/api/friends/invites/:code", (c) => {
    const r = resolveInvite(db, c.req.param("code"), c.var.user.id);
    if (r.state === "invalid") return c.json(INVALID_INVITE, 404);
    if (r.state === "self") return c.json(SELF_INVITE, 400);
    return c.json({ inviter: r.inviter, alreadyFriends: r.state === "already" });
  });

  // confirma o convite: cria a amizade e consome o código
  app.post("/api/friends/invites/:code/accept", (c) => {
    const me = c.var.user.id;
    const code = c.req.param("code");
    const result = transaction(db, () => {
      const r = resolveInvite(db, code, me);
      if (r.state === "open") {
        const [low, high] = pair(me, r.inviter.id);
        db.prepare("INSERT INTO friendships (user_low, user_high) VALUES (?, ?)").run(low, high);
        db.prepare("UPDATE friend_invites SET used_by = ? WHERE code = ? AND used_by IS NULL").run(me, code);
      }
      return r;
    });
    if (result.state === "invalid") return c.json(INVALID_INVITE, 404);
    if (result.state === "self") return c.json(SELF_INVITE, 400);
    return c.json({ friend: result.inviter }, result.state === "open" ? 201 : 200);
  });

  // badge em lote para os cartões de Estante e Por ano: só contagens > 0
  app.get("/api/friends/badges", (c) => {
    const rows = db.prepare(BADGES_SQL).all(c.var.user.id) as { itemId: string; count: number }[];
    const badges: Record<string, number> = {};
    for (const r of rows) if (r.count > 0) badges[r.itemId] = r.count;
    return c.json({ badges });
  });

  // meus amigos, cada um com o que está lendo agora (uma consulta só)
  app.get("/api/friends", (c) => {
    const rows = db
      .prepare(
        `WITH ${MY_FRIENDS}
         SELECT u.id AS u_id, u.name AS u_name, u.picture AS u_picture, ${FRIEND_BOOK_COLS}
         FROM my_friends f
         JOIN users u ON u.id = f.id
         LEFT JOIN user_books ub ON ub.user_id = u.id AND ub.status = 'reading'
         LEFT JOIN books b ON b.id = ub.book_id
         ORDER BY u.name IS NULL, u.name COLLATE NOCASE, u.id, ub.updated_at DESC`,
      )
      .all(c.var.user.id) as any[];
    const friends: FriendSummary[] = [];
    const byId = new Map<string, FriendSummary>();
    for (const r of rows) {
      let f = byId.get(r.u_id);
      if (!f) {
        f = { id: r.u_id, name: r.u_name, picture: r.u_picture, reading: [] };
        byId.set(r.u_id, f);
        friends.push(f);
      }
      if (r.b_id) f.reading.push(rowToFriendBook(r));
    }
    return c.json({ friends });
  });

  // estante de um amigo: só Lendo e Lidos, com os comentários públicos de cada livro.
  // Não amigo recebe 404, igual a id inexistente.
  app.get("/api/friends/:userId/shelf", (c) => {
    const friendId = c.req.param("userId");
    if (!areFriends(db, c.var.user.id, friendId)) return c.json(NOT_FOUND, 404);
    const friend = findFriendUser(db, friendId);
    if (!friend) return c.json(NOT_FOUND, 404);
    const rows = db
      .prepare(
        `SELECT ${FRIEND_BOOK_COLS}
         FROM user_books ub JOIN books b ON b.id = ub.book_id
         WHERE ub.user_id = ? AND ub.status IN ('reading', 'read')
         ORDER BY ub.updated_at DESC`,
      )
      .all(friendId) as any[];
    // comentários públicos de todos esses livros numa consulta só; nunca os privados
    const comments = db
      .prepare(
        `SELECT c.item_id, c.id, c.body, c.created_at, c.updated_at
         FROM book_comments c JOIN user_books ub ON ub.id = c.item_id
         WHERE c.user_id = ? AND c.visibility = 'public' AND ub.status IN ('reading', 'read')
         ORDER BY c.created_at DESC, c.rowid DESC`,
      )
      .all(friendId) as any[];
    const byItem = new Map<string, PublicComment[]>();
    for (const r of comments) {
      const list = byItem.get(r.item_id) ?? [];
      list.push(rowToPublicComment(r));
      byItem.set(r.item_id, list);
    }
    const items: FriendShelfItem[] = rows.map((r) => ({ ...rowToFriendBook(r), comments: byItem.get(r.item_id) ?? [] }));
    return c.json({ friend, items });
  });

  // desfaz a amizade, valendo para os dois lados
  app.delete("/api/friends/:userId", (c) => {
    const [low, high] = pair(c.var.user.id, c.req.param("userId"));
    const info = db.prepare("DELETE FROM friendships WHERE user_low = ? AND user_high = ?").run(low, high);
    return info.changes ? c.json({ ok: true }) : c.json(NOT_FOUND, 404);
  });

  // amigos que já leram um livro da minha estante (tela do livro). Exige que o item seja meu.
  app.get("/api/shelf/:id/friends", (c) => {
    const me = c.var.user.id;
    const id = c.req.param("id");
    if (!getItem(db, me, id)) return c.json(NOT_FOUND, 404);
    const rows = db.prepare(BOOK_FRIENDS_SQL).all(me, id) as unknown as FriendUser[];
    const friends: FriendUser[] = rows.map((r) => ({ id: r.id, name: r.name, picture: r.picture }));
    return c.json({ friends });
  });

  return app;
}
