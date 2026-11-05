import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import { transaction, type DB } from "../db.js";
import type { AppEnv, Book, BookInput, ShelfItem, Status } from "../types.js";
import { ValidationError, optDate, optInt, optStr, parseBookInput, parseStatus } from "../validate.js";
import { AD_REQUIRED } from "./ads.js";
import { fetchDetails } from "./search.js";

const SELECT_ITEM = `
  SELECT ub.id, ub.status, ub.rating, ub.review, ub.started_at, ub.finished_at, ub.read_year,
         ub.created_at, ub.updated_at,
         b.id AS b_id, b.source AS b_source, b.source_id AS b_source_id, b.title AS b_title,
         b.authors AS b_authors, b.page_count AS b_page_count,
         b.published_year AS b_published_year, b.isbn13 AS b_isbn13, b.cover_ref AS b_cover_ref
  FROM user_books ub JOIN books b ON b.id = ub.book_id`;

function rowToItem(r: any): ShelfItem {
  return {
    id: r.id,
    status: r.status,
    rating: r.rating,
    review: r.review,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    readYear: r.read_year,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    book: {
      id: r.b_id,
      source: r.b_source,
      sourceId: r.b_source_id,
      title: r.b_title,
      authors: JSON.parse(r.b_authors ?? "[]"),
      pageCount: r.b_page_count,
      publishedYear: r.b_published_year,
      isbn13: r.b_isbn13,
      coverRef: r.b_cover_ref,
    },
  };
}

export function findOrCreateBook(db: DB, input: BookInput): string {
  if (input.source !== "manual" && input.sourceId) {
    const existing = db.prepare("SELECT id FROM books WHERE source = ? AND source_id = ?").get(input.source, input.sourceId) as { id: string } | undefined;
    if (existing) return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO books (id, source, source_id, title, authors, page_count, published_year, isbn13, cover_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, input.source, input.sourceId ?? null, input.title, JSON.stringify(input.authors ?? []),
    input.pageCount ?? null, input.publishedYear ?? null, input.isbn13 ?? null, input.coverRef ?? null,
  );
  return id;
}

export function getItem(db: DB, userId: string, id: string): ShelfItem | null {
  const row = db.prepare(`${SELECT_ITEM} WHERE ub.user_id = ? AND ub.id = ?`).get(userId, id);
  return row ? rowToItem(row) : null;
}

/** Regras de consistência entre status, datas e ano de leitura. */
function reconcile(next: { status: Status; startedAt: string | null; finishedAt: string | null; readYear: number | null }) {
  if (next.status === "read") {
    if (next.finishedAt) next.readYear = Number(next.finishedAt.slice(0, 4));
    if (!next.readYear) next.readYear = new Date().getFullYear();
  } else if (next.status === "want") {
    // ainda não começou: limpa datas
    next.startedAt = null;
    next.finishedAt = null;
    next.readYear = null;
  } else {
    // lendo / abandonado: não tem data de término nem ano de leitura concluída
    next.finishedAt = null;
    next.readYear = null;
  }
  if (next.startedAt && next.finishedAt && next.finishedAt < next.startedAt) {
    throw new ValidationError("A data de término não pode ser antes do início");
  }
}

export function shelfRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.onError((err, c) => {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    console.error(err);
    return c.json({ error: "Erro interno" }, 500);
  });

  // lista a estante, com filtros opcionais por status e ano de leitura
  app.get("/api/shelf", (c) => {
    const user = c.var.user;
    const status = c.req.query("status");
    const year = c.req.query("year");
    const where: string[] = ["ub.user_id = ?"];
    const params: SQLInputValue[] = [user.id];
    if (status) { where.push("ub.status = ?"); params.push(parseStatus(status)); }
    if (year) { where.push("ub.read_year = ?"); params.push(optInt(year, "year", 1000, 3000)); }
    const order = status === "read" || year
      ? "ORDER BY ub.finished_at DESC NULLS LAST, ub.updated_at DESC"
      : "ORDER BY ub.updated_at DESC";
    const rows = db.prepare(`${SELECT_ITEM} WHERE ${where.join(" AND ")} ${order}`).all(...params);
    return c.json({ items: rows.map(rowToItem) });
  });

  app.get("/api/shelf/:id", (c) => {
    const item = getItem(db, c.var.user.id, c.req.param("id"));
    return item ? c.json({ item }) : c.json({ error: "Não encontrado" }, 404);
  });

  // adiciona um livro à estante (ou atualiza se já estiver nela)
  app.post("/api/shelf", async (c) => {
    const user = c.var.user;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const book = parseBookInput(body.book);
    const status = body.status === undefined ? "want" : parseStatus(body.status);
    const fields = {
      status,
      rating: optInt(body.rating, "rating", 1, 5),
      review: optStr(body.review, "review"),
      startedAt: optDate(body.startedAt, "startedAt"),
      finishedAt: optDate(body.finishedAt, "finishedAt"),
      readYear: optInt(body.readYear, "readYear", 1000, 3000),
    };
    reconcile(fields);

    // Gate de monetização: criar um livro NOVO na estante exige o anúncio da sessão.
    // Atualizar um livro que já está na estante continua livre.
    if (!c.var.adUnlocked) {
      const already = book.source !== "manual" && book.sourceId
        ? db.prepare("SELECT ub.id FROM user_books ub JOIN books b ON b.id = ub.book_id WHERE ub.user_id = ? AND b.source = ? AND b.source_id = ?").get(user.id, book.source, book.sourceId)
        : undefined;
      if (!already) return c.json(AD_REQUIRED, 403);
    }

    const result = transaction(db, () => {
      const bookId = findOrCreateBook(db, book);
      const existing = db.prepare("SELECT id FROM user_books WHERE user_id = ? AND book_id = ?").get(user.id, bookId) as { id: string } | undefined;
      const id = existing?.id ?? randomUUID();
      if (existing) {
        db.prepare(
          `UPDATE user_books SET status = ?, rating = COALESCE(?, rating), review = COALESCE(?, review),
             started_at = ?, finished_at = ?, read_year = ?, updated_at = datetime('now') WHERE id = ?`,
        ).run(fields.status, fields.rating, fields.review, fields.startedAt, fields.finishedAt, fields.readYear, id);
      } else {
        db.prepare(
          `INSERT INTO user_books (id, user_id, book_id, status, rating, review, started_at, finished_at, read_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, user.id, bookId, fields.status, fields.rating, fields.review, fields.startedAt, fields.finishedAt, fields.readYear);
      }
      return { id, created: !existing };
    });

    return c.json({ item: getItem(db, user.id, result.id) }, result.created ? 201 : 200);
  });

  // atualização parcial: status, nota, resenha, datas, ano
  app.patch("/api/shelf/:id", async (c) => {
    const user = c.var.user;
    const current = getItem(db, user.id, c.req.param("id"));
    if (!current) return c.json({ error: "Não encontrado" }, 404);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

    const fields = {
      status: has("status") ? parseStatus(body.status) : current.status,
      rating: has("rating") ? optInt(body.rating, "rating", 1, 5) : current.rating,
      review: has("review") ? optStr(body.review, "review") : current.review,
      startedAt: has("startedAt") ? optDate(body.startedAt, "startedAt") : current.startedAt,
      finishedAt: has("finishedAt") ? optDate(body.finishedAt, "finishedAt") : current.finishedAt,
      readYear: has("readYear") ? optInt(body.readYear, "readYear", 1000, 3000) : current.readYear,
    };
    // se o usuário mudou o ano manualmente e a data de término não bate, descarta a data
    if (has("readYear") && !has("finishedAt") && fields.finishedAt && fields.readYear && Number(fields.finishedAt.slice(0, 4)) !== fields.readYear) {
      fields.finishedAt = null;
    }
    // ao concluir um livro sem data, assume hoje (o usuário pode editar depois)
    if (fields.status === "read" && current.status !== "read" && !has("finishedAt") && !has("readYear") && !fields.finishedAt) {
      fields.finishedAt = new Date().toISOString().slice(0, 10);
    }
    reconcile(fields);

    // edição de dados do livro (apenas para livros manuais)
    if (has("book") && current.book.source === "manual") {
      const b = parseBookInput({ ...body.book as object, source: "manual" });
      db.prepare(
        `UPDATE books SET title = ?, authors = ?, page_count = ?, published_year = ?, isbn13 = ? WHERE id = ?`,
      ).run(b.title, JSON.stringify(b.authors ?? []), b.pageCount ?? null, b.publishedYear ?? null, b.isbn13 ?? null, current.book.id);
    }

    db.prepare(
      `UPDATE user_books SET status = ?, rating = ?, review = ?, started_at = ?, finished_at = ?, read_year = ?,
         updated_at = datetime('now') WHERE id = ?`,
    ).run(fields.status, fields.rating, fields.review, fields.startedAt, fields.finishedAt, fields.readYear, current.id);

    return c.json({ item: getItem(db, user.id, current.id) });
  });

  // sinopse sob demanda, direto da fonte externa (nada é gravado no banco)
  app.get("/api/shelf/:id/details", async (c) => {
    const item = getItem(db, c.var.user.id, c.req.param("id"));
    if (!item) return c.json({ error: "Não encontrado" }, 404);
    if (item.book.source === "manual" || !item.book.sourceId) return c.json({ description: null });
    c.header("Cache-Control", "private, max-age=3600");
    return c.json(await fetchDetails(item.book.source, item.book.sourceId));
  });

  app.delete("/api/shelf/:id", (c) => {
    const info = db.prepare("DELETE FROM user_books WHERE user_id = ? AND id = ?").run(c.var.user.id, c.req.param("id"));
    return info.changes ? c.json({ ok: true }) : c.json({ error: "Não encontrado" }, 404);
  });

  return app;
}

export type { Book };
