import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIVATE_KEYS, addBook, allKeys, befriend, login, openDatabase, twoFriends } from "./friends-helpers.ts";

const REVIEW = "Resenha secretíssima que só eu vejo";

/** Ana com um livro em cada status, todos com nota, resenha e datas. */
async function anaWithShelf() {
  const ctx = await twoFriends();
  const { ana } = ctx;
  const extra = { rating: 5, review: REVIEW };
  await addBook(ana, { source: "google", sourceId: "g-want", title: "Quero" }, "want", extra);
  await addBook(ana, { source: "google", sourceId: "g-reading", title: "Lendo agora", authors: ["Autora"] }, "reading", { ...extra, startedAt: "2024-01-02" });
  await addBook(ana, { source: "google", sourceId: "g-read", title: "Já li", isbn13: "9788525432186" }, "read", { ...extra, startedAt: "2023-01-01", finishedAt: "2023-02-01" });
  await addBook(ana, { source: "google", sourceId: "g-abandoned", title: "Larguei" }, "abandoned", extra);
  // sinopse gravada no banco não pode sair
  ctx.db.prepare("UPDATE books SET description = 'Sinopse guardada'").run();
  return ctx;
}

test("amigo vê só Lendo e Lidos da estante do outro, nos dois sentidos", async () => {
  const { ana, bia } = await anaWithShelf();
  const r = await bia.call("GET", `/api/friends/${ana.user.id}/shelf`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.friend, { id: ana.user.id, name: "Ana", picture: null });
  const byTitle = Object.fromEntries(r.json.items.map((i: any) => [i.book.title, i]));
  assert.deepEqual(Object.keys(byTitle).sort(), ["Já li", "Lendo agora"]);
  assert.equal(byTitle["Já li"].status, "read");
  assert.equal(byTitle["Já li"].readYear, 2023);
  assert.equal(byTitle["Lendo agora"].status, "reading");
  assert.equal(byTitle["Lendo agora"].readYear, null);
  assert.deepEqual(byTitle["Lendo agora"].book.authors, ["Autora"]);
  assert.deepEqual(Object.keys(byTitle["Já li"]).sort(), ["book", "comments", "currentPage", "readYear", "status"]);
  assert.deepEqual(Object.keys(byTitle["Já li"].book).sort(), ["authors", "coverRef", "id", "isbn13", "pageCount", "publishedYear", "source", "sourceId", "title"]);

  // o outro sentido também vale
  await addBook(bia, { source: "manual", title: "Da Bia" }, "reading");
  const back = await ana.call("GET", `/api/friends/${bia.user.id}/shelf`);
  assert.equal(back.status, 200);
  assert.deepEqual(back.json.items.map((i: any) => i.book.title), ["Da Bia"]);
});

test("lista de amigos traz em reading só o que cada um está lendo", async () => {
  const { db, ana, bia } = await anaWithShelf();
  const caio = await login(db, "Caio");
  await befriend(bia, caio);
  const r = await bia.call("GET", "/api/friends");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.friends.map((f: any) => f.name), ["Ana", "Caio"]);
  const [a, c] = r.json.friends;
  assert.deepEqual(Object.keys(a).sort(), ["id", "name", "picture", "reading"]);
  assert.deepEqual(a.reading.map((i: any) => [i.status, i.book.title]), [["reading", "Lendo agora"]]);
  assert.deepEqual(c.reading, []);
  // Ana não é amiga de Caio
  assert.deepEqual((await ana.call("GET", "/api/friends")).json.friends.map((f: any) => f.name), ["Bia"]);
});

test("nota, resenha, datas, sinopse e e-mail não saem nas rotas de amigo", async () => {
  const { ana, bia } = await anaWithShelf();
  for (const path of [`/api/friends/${ana.user.id}/shelf`, "/api/friends"]) {
    const r = await bia.call("GET", path);
    assert.equal(r.status, 200);
    const text = JSON.stringify(r.json);
    assert.ok(!text.includes(REVIEW), `${path} vazou a resenha`);
    assert.ok(!text.includes("Sinopse guardada"), `${path} vazou a sinopse`);
    assert.ok(!text.includes("@x.com"), `${path} vazou e-mail`);
    const keys = allKeys(r.json);
    for (const k of PRIVATE_KEYS) assert.ok(!keys.has(k), `${path} trouxe a chave ${k}`);
  }
});

test("não amigo, ex-amigo e id inexistente recebem o mesmo 404", async () => {
  const { db, ana, bia } = await anaWithShelf();
  const caio = await login(db, "Caio");
  const expected = { status: 404, json: { error: "Não encontrado" } };
  assert.deepEqual(await caio.call("GET", `/api/friends/${ana.user.id}/shelf`), expected);
  assert.deepEqual(await bia.call("GET", "/api/friends/nao-existe/shelf"), expected);
  assert.deepEqual(await ana.call("GET", `/api/friends/${ana.user.id}/shelf`), expected);
  await bia.call("DELETE", `/api/friends/${ana.user.id}`);
  assert.deepEqual(await bia.call("GET", `/api/friends/${ana.user.id}/shelf`), expected);
  assert.deepEqual(await ana.call("GET", `/api/friends/${bia.user.id}/shelf`), expected);
});

test("amigo sem nome continua na lista, depois dos que têm nome", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const zeca = await login(db, "zeca");
  const semNome = await login(db, "Sem");
  db.prepare("UPDATE users SET name = NULL WHERE id = ?").run(semNome.user.id);
  await befriend(ana, semNome);
  await befriend(ana, zeca);
  const r = await ana.call("GET", "/api/friends");
  assert.deepEqual(r.json.friends.map((f: any) => f.name), ["zeca", null]);
});
