import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addBook, login, openDatabase, type DB } from "./friends-helpers.ts";

const MANUAL = { source: "manual", title: "Diário da Ana" };
const GOOGLE = { source: "google", sourceId: "vol-1", title: "Dom Casmurro" };

function bookExists(db: DB, id: string) {
  return db.prepare("SELECT 1 FROM books WHERE id = ?").get(id) !== undefined;
}

test("remover item manual pela API apaga a linha de books", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, MANUAL);
  assert.equal(bookExists(db, item.book.id), true);

  const r = await ana.call("DELETE", `/api/shelf/${item.id}`);
  assert.equal(r.status, 200);
  assert.equal(bookExists(db, item.book.id), false);
});

test("DELETE FROM users apaga o livro manual da pessoa; google e manual de outra pessoa ficam", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const anaManual = await addBook(ana, MANUAL);
  const anaGoogle = await addBook(ana, GOOGLE);
  const biaManual = await addBook(bia, { source: "manual", title: "Diário da Bia" });

  db.prepare("DELETE FROM users WHERE id = ?").run(ana.user.id);

  assert.equal(bookExists(db, anaManual.book.id), false);
  assert.equal(bookExists(db, anaGoogle.book.id), true);
  assert.equal(bookExists(db, biaManual.book.id), true);
});

test("remover item google não apaga a linha de books", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, GOOGLE);

  const r = await ana.call("DELETE", `/api/shelf/${item.id}`);
  assert.equal(r.status, 200);
  assert.equal(bookExists(db, item.book.id), true);
});

test("órfão manual de um banco existente é limpo ao reabrir com openDatabase", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estante-orfaos-"));
  const file = path.join(dir, "orfaos.db");
  try {
    const before = openDatabase(file);
    const addBookRow = before.prepare("INSERT INTO books (id, source, title) VALUES (?, ?, ?)");
    addBookRow.run("manual-orfao", "manual", "Órfão");
    addBookRow.run("manual-com-item", "manual", "Com item");
    addBookRow.run("google-orfao", "google", "Sem item, mas compartilhável");
    before.prepare("INSERT INTO users (id) VALUES ('u1')").run();
    before.prepare("INSERT INTO user_books (id, user_id, book_id, status) VALUES ('i1', 'u1', 'manual-com-item', 'read')").run();
    before.close();

    const after = openDatabase(file);
    assert.equal(bookExists(after, "manual-orfao"), false);
    assert.equal(bookExists(after, "manual-com-item"), true);
    assert.equal(bookExists(after, "google-orfao"), true);
    after.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
