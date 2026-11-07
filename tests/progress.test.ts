import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addBook, login, openDatabase, twoFriends } from "./friends-helpers.ts";

const book = { source: "google", sourceId: "prog-1", title: "Livro longo", pageCount: 300 };

test("página atual: salva ao adicionar e ao editar, e pode ser apagada", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading", { currentPage: 50 });
  assert.equal(item.currentPage, 50);
  const patch = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: 120 });
  assert.equal(patch.status, 200);
  assert.equal(patch.json.item.currentPage, 120);
  // outros campos não mexem na página
  const rating = await ana.call("PATCH", `/api/shelf/${item.id}`, { rating: 4 });
  assert.equal(rating.json.item.currentPage, 120);
  const cleared = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: null });
  assert.equal(cleared.json.item.currentPage, null);
  // página acima do total do livro é aceita: a edição pode ter mais páginas que a fonte diz
  const over = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: 350 });
  assert.equal(over.json.item.currentPage, 350);
});

test("página atual segue o status: Lendo e Abandonado guardam, Quero ler e Lido limpam", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading", { currentPage: 80 });
  const abandoned = await ana.call("PATCH", `/api/shelf/${item.id}`, { status: "abandoned" });
  assert.equal(abandoned.json.item.currentPage, 80);
  const read = await ana.call("PATCH", `/api/shelf/${item.id}`, { status: "read" });
  assert.equal(read.json.item.currentPage, null);
  const reading = await ana.call("PATCH", `/api/shelf/${item.id}`, { status: "reading", currentPage: 10 });
  assert.equal(reading.json.item.currentPage, 10);
  const want = await ana.call("PATCH", `/api/shelf/${item.id}`, { status: "want" });
  assert.equal(want.json.item.currentPage, null);
  // página informada junto com um status que não usa página é descartada
  const ignored = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: 30 });
  assert.equal(ignored.json.item.currentPage, null);
  const wantNew = await addBook(ana, { source: "google", sourceId: "prog-want", title: "Fila" }, "want", { currentPage: 5 });
  assert.equal(wantNew.currentPage, null);
});

test("adicionar de novo um livro que já está na estante mantém a página, a menos que mude", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  await addBook(ana, book, "reading", { currentPage: 40 });
  const again = await addBook(ana, book, "reading");
  assert.equal(again.currentPage, 40);
  const moved = await addBook(ana, book, "reading", { currentPage: 60 });
  assert.equal(moved.currentPage, 60);
  const done = await addBook(ana, book, "read");
  assert.equal(done.currentPage, null);
});

test("página atual inválida dá 400 e não muda o valor salvo", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading", { currentPage: 12 });
  for (const currentPage of [-1, 1.5, "abc", 100001, true]) {
    const r = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage });
    assert.equal(r.status, 400, String(currentPage));
  }
  assert.equal((await ana.call("GET", `/api/shelf/${item.id}`)).json.item.currentPage, 12);
  // texto numérico vindo de formulário é aceito
  const text = await ana.call("PATCH", `/api/shelf/${item.id}`, { currentPage: "33" });
  assert.equal(text.json.item.currentPage, 33);
});

test("amigo vê a página de quem está lendo, nunca de um Lido", async () => {
  const { ana, bia } = await twoFriends();
  await addBook(ana, book, "reading", { currentPage: 150 });
  await addBook(ana, { source: "google", sourceId: "prog-lido", title: "Já li" }, "read");
  const shelf = await bia.call("GET", `/api/friends/${ana.user.id}/shelf`);
  const byTitle = Object.fromEntries(shelf.json.items.map((i: any) => [i.book.title, i]));
  assert.equal(byTitle["Livro longo"].currentPage, 150);
  assert.equal(byTitle["Já li"].currentPage, null);
  const list = await bia.call("GET", "/api/friends");
  assert.equal(list.json.friends[0].reading[0].currentPage, 150);
});

test("migração adiciona a coluna de página em banco antigo", () => {
  const dir = mkdtempSync(join(tmpdir(), "estante-pagina-"));
  try {
    const file = join(dir, "t.db");
    const old = openDatabase(file);
    old.exec("ALTER TABLE user_books DROP COLUMN current_page");
    old.close();
    const db = openDatabase(file);
    const cols = (db.prepare("PRAGMA table_info(user_books)").all() as any[]).map((c) => c.name);
    assert.ok(cols.includes("current_page"));
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
