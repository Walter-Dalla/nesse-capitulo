import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, login, openDatabase } from "./friends-helpers.ts";

const manual = { source: "manual", title: "Livro" };

test("item inexistente da estante dá 404 NOT_FOUND nas rotas de estante e comentários", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const expected = { status: 404, json: { error: "Não encontrado", code: "NOT_FOUND" } };
  assert.deepEqual(await ana.call("GET", "/api/shelf/nao-existe"), expected);
  assert.deepEqual(await ana.call("PATCH", "/api/shelf/nao-existe", { rating: 3 }), expected);
  assert.deepEqual(await ana.call("GET", "/api/shelf/nao-existe/details"), expected);
  assert.deepEqual(await ana.call("DELETE", "/api/shelf/nao-existe"), expected);
  assert.deepEqual(await ana.call("GET", "/api/shelf/nao-existe/comments"), expected);
  assert.deepEqual(await ana.call("POST", "/api/shelf/nao-existe/comments", { body: "oi" }), expected);
  assert.deepEqual(await ana.call("PATCH", "/api/comments/nao-existe", { body: "oi" }), expected);
  assert.deepEqual(await ana.call("DELETE", "/api/comments/nao-existe"), expected);
});

test("data de término antes do início dá 400 DATE_RANGE_INVALID", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const r = await ana.call("POST", "/api/shelf", { book: manual, status: "read", startedAt: "2024-02-01", finishedAt: "2024-01-01" });
  assert.deepEqual(r, { status: 400, json: { error: "A data de término não pode ser antes do início", code: "DATE_RANGE_INVALID" } });
});

test("ISBN de 5 dígitos dá 400 ISBN_INVALID", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const r = await ana.call("POST", "/api/shelf", { book: { ...manual, isbn13: "12345" } });
  assert.deepEqual(r, { status: 400, json: { error: "ISBN deve ter 10 ou 13 dígitos", code: "ISBN_INVALID" } });
});

test("comentário vazio dá 400 COMMENT_EMPTY", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const item = await addBook(ana, manual);
  const r = await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "   " });
  assert.deepEqual(r, { status: 400, json: { error: "Escreva o comentário", code: "COMMENT_EMPTY" } });
});

test("visibilidade inválida do comentário dá 400 VALIDATION", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const item = await addBook(ana, manual);
  const r = await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "oi", visibility: "todos" });
  assert.deepEqual(r, { status: 400, json: { error: "visibility deve ser um de: private, public", code: "VALIDATION" } });
});

test("currentPage inválido dá 400 VALIDATION", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const item = await addBook(ana, manual, "reading");
  const r = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: -1 });
  assert.deepEqual(r, { status: 400, json: { error: "currentPage deve ser inteiro entre 0 e 100000", code: "VALIDATION" } });
});
