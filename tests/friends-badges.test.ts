import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, befriend, login, openDatabase, twoFriends } from "./friends-helpers.ts";

const { BADGES_SQL } = await import("../server/routes/friends.ts");

/** Amigos que já leram o item `itemId` de `s`, pelos nomes. */
async function names(s: { call: any }, itemId: string) {
  const r = await s.call("GET", `/api/shelf/${itemId}/friends`);
  assert.equal(r.status, 200);
  return r.json.friends.map((f: any) => f.name);
}

async function badges(s: { call: any }) {
  const r = await s.call("GET", "/api/friends/badges");
  assert.equal(r.status, 200);
  return r.json.badges;
}

test("mesmo book_id (mesmo source + sourceId) casa", async () => {
  const { ana, bia } = await twoFriends();
  const book = { source: "google", sourceId: "mesmo-1", title: "Sapiens", authors: ["Yuval Harari"] };
  await addBook(ana, book, "read");
  const mine = await addBook(bia, book, "want");
  assert.deepEqual(await names(bia, mine.id), ["Ana"]);
  assert.deepEqual(await badges(bia), { [mine.id]: 1 });
  const r = await bia.call("GET", `/api/shelf/${mine.id}/friends`);
  assert.deepEqual(Object.keys(r.json.friends[0]).sort(), ["id", "name", "picture"]);
});

test("ISBN igual com fontes diferentes casa, e x/X casa", async () => {
  const { ana, bia } = await twoFriends();
  await addBook(ana, { source: "google", sourceId: "g-isbn", title: "Edição Google", isbn13: "9788525432186" }, "read");
  const mine = await addBook(bia, { source: "openlibrary", sourceId: "OL1W", title: "Edição OL", isbn13: "9788525432186" }, "reading");
  assert.deepEqual(await names(bia, mine.id), ["Ana"]);

  await addBook(ana, { source: "manual", title: "Manual x", isbn13: "123456789x" }, "read");
  const upper = await addBook(bia, { source: "google", sourceId: "g-X", title: "Google X", isbn13: "123456789X" }, "want");
  assert.deepEqual(await names(bia, upper.id), ["Ana"]);
  assert.deepEqual(await badges(bia), { [mine.id]: 1, [upper.id]: 1 });
});

test("título e autor iguais sem ISBN não casam; manual sem ISBN não casa", async () => {
  const { ana, bia } = await twoFriends();
  await addBook(ana, { source: "google", sourceId: "g-a", title: "Cosmos", authors: ["Carl Sagan"] }, "read");
  const other = await addBook(bia, { source: "openlibrary", sourceId: "OL-cosmos", title: "Cosmos", authors: ["Carl Sagan"] }, "read");
  await addBook(ana, { source: "manual", title: "Dom Casmurro", authors: ["Machado de Assis"] }, "read");
  const manual = await addBook(bia, { source: "manual", title: "Dom Casmurro", authors: ["Machado de Assis"] }, "read");
  assert.deepEqual(await names(bia, other.id), []);
  assert.deepEqual(await names(bia, manual.id), []);
  assert.deepEqual(await badges(bia), {});
});

test("só conta amigo com o livro em read", async () => {
  const { db, ana, bia } = await twoFriends();
  const book = { source: "google", sourceId: "status-1", title: "Livro" };
  const mine = await addBook(bia, book, "read");
  for (const status of ["reading", "want", "abandoned"]) {
    await addBook(ana, book, status);
    assert.deepEqual(await names(bia, mine.id), [], status);
    assert.deepEqual(await badges(bia), {}, status);
  }
  await addBook(ana, book, "read");
  assert.deepEqual(await names(bia, mine.id), ["Ana"]);
  // meu item conta em qualquer status
  await bia.call("PATCH", `/api/shelf/${mine.id}`, { status: "want" });
  assert.deepEqual(await badges(bia), { [mine.id]: 1 });
  void db;
});

test("não amigo e ex-amigo não contam; eu não conto", async () => {
  const { db, ana, bia } = await twoFriends();
  const caio = await login(db, "Caio");
  const book = { source: "google", sourceId: "quem-1", title: "Livro", isbn13: "9780000000001" };
  await addBook(caio, book, "read");
  const mine = await addBook(bia, book, "read");
  assert.deepEqual(await names(bia, mine.id), []);
  assert.deepEqual(await badges(bia), {});

  await addBook(ana, book, "read");
  assert.deepEqual(await names(bia, mine.id), ["Ana"]);
  await bia.call("DELETE", `/api/friends/${ana.user.id}`);
  assert.deepEqual(await names(bia, mine.id), []);
  assert.deepEqual(await badges(bia), {});
});

test("amigo com o mesmo livro em duas linhas conta 1; vários amigos somam e vêm por nome", async () => {
  const { db, ana, bia } = await twoFriends();
  // Ana leu a edição do Google e a da Open Library, com o mesmo ISBN
  await addBook(ana, { source: "google", sourceId: "dup-g", title: "Livro", isbn13: "9780000000002" }, "read");
  await addBook(ana, { source: "openlibrary", sourceId: "dup-ol", title: "Livro", isbn13: "9780000000002" }, "read");
  const mine = await addBook(bia, { source: "google", sourceId: "dup-g", title: "Livro", isbn13: "9780000000002" }, "reading");
  assert.deepEqual(await names(bia, mine.id), ["Ana"]);
  assert.deepEqual(await badges(bia), { [mine.id]: 1 });

  const caio = await login(db, "caio");
  const davi = await login(db, "Davi");
  await befriend(caio, bia);
  await befriend(bia, davi);
  await addBook(davi, { source: "manual", title: "Outra edição", isbn13: "9780000000002" }, "read");
  await addBook(caio, { source: "google", sourceId: "dup-g", title: "Livro" }, "read");
  assert.deepEqual(await names(bia, mine.id), ["Ana", "caio", "Davi"]);
  assert.deepEqual(await badges(bia), { [mine.id]: 3 });
});

test("item alheio ou inexistente dá 404", async () => {
  const { ana, bia } = await twoFriends();
  const anaItem = await addBook(ana, { source: "google", sourceId: "alheio", title: "Da Ana" }, "read");
  assert.deepEqual(await bia.call("GET", `/api/shelf/${anaItem.id}/friends`), { status: 404, json: { error: "Não encontrado", code: "NOT_FOUND" } });
  assert.equal((await bia.call("GET", "/api/shelf/nao-existe/friends")).status, 404);
});

test("sem amigos, badges vazio; itens sem contagem não aparecem", async () => {
  const db = openDatabase(":memory:");
  const solo = await login(db, "Solo");
  assert.deepEqual(await badges(solo), {});
  const item = await addBook(solo, { source: "google", sourceId: "solo-1", title: "Sozinho" }, "read");
  assert.deepEqual(await badges(solo), {});
  assert.deepEqual(await names(solo, item.id), []);

  const { ana, bia } = await twoFriends(db);
  const hit = await addBook(bia, { source: "google", sourceId: "hit", title: "Hit" }, "want");
  const miss = await addBook(bia, { source: "google", sourceId: "miss", title: "Miss" }, "want");
  await addBook(ana, { source: "google", sourceId: "hit", title: "Hit" }, "read");
  const b = await badges(bia);
  assert.deepEqual(b, { [hit.id]: 1 });
  assert.ok(!(miss.id in b));
});

test("plano da consulta de lote usa os índices de book_id e de ISBN", () => {
  const db = openDatabase(":memory:");
  const plan = (db.prepare(`EXPLAIN QUERY PLAN ${BADGES_SQL}`).all("x") as any[]).map((r) => r.detail).join("\n");
  assert.match(plan, /idx_books_isbn_upper/);
  assert.match(plan, /idx_user_books_book/);
});
