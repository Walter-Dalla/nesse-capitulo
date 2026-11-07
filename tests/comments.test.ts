import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, login, openDatabase, twoFriends } from "./friends-helpers.ts";

const book = { source: "google", sourceId: "com-1", title: "Sapiens", isbn13: "9788525432186" };
const SECRET = "Comentário privado que só eu vejo";

async function comments(s: { call: any }, itemId: string) {
  const r = await s.call("GET", `/api/shelf/${itemId}/comments`);
  assert.equal(r.status, 200);
  return r.json as { comments: any[]; friends: any[] };
}

test("comentar: privado por padrão, público quando escolhido, mais novo primeiro", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading");
  const first = await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "  Primeiro  " });
  assert.equal(first.status, 201);
  assert.equal(first.json.comment.body, "Primeiro");
  assert.equal(first.json.comment.visibility, "private");
  assert.deepEqual(Object.keys(first.json.comment).sort(), ["body", "createdAt", "id", "updatedAt", "visibility"]);
  const second = await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "Segundo", visibility: "public" });
  assert.equal(second.json.comment.visibility, "public");
  const list = await comments(ana, item.id);
  assert.deepEqual(list.comments.map((c) => [c.body, c.visibility]), [["Segundo", "public"], ["Primeiro", "private"]]);
  assert.deepEqual(list.friends, []);
});

test("comentário inválido dá 400", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading");
  for (const payload of [{}, { body: "" }, { body: "   " }, { body: 42 }, { body: "x".repeat(2001) }, { body: "ok", visibility: "amigos" }]) {
    const r = await ana.call("POST", `/api/shelf/${item.id}/comments`, payload);
    assert.equal(r.status, 400, JSON.stringify(payload).slice(0, 40));
  }
  assert.deepEqual((await comments(ana, item.id)).comments, []);
  const ok = await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "x".repeat(2000) });
  assert.equal(ok.status, 201);
});

test("editar texto e visibilidade; apagar", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const item = await addBook(ana, book, "reading");
  const c = (await ana.call("POST", `/api/shelf/${item.id}/comments`, { body: "Rascunho" })).json.comment;
  const pub = await ana.call("PATCH", `/api/comments/${c.id}`, { visibility: "public" });
  assert.equal(pub.status, 200);
  assert.deepEqual([pub.json.comment.body, pub.json.comment.visibility], ["Rascunho", "public"]);
  const text = await ana.call("PATCH", `/api/comments/${c.id}`, { body: "Versão final" });
  assert.deepEqual([text.json.comment.body, text.json.comment.visibility], ["Versão final", "public"]);
  assert.equal((await ana.call("PATCH", `/api/comments/${c.id}`, { body: "" })).status, 400);
  assert.equal((await ana.call("PATCH", `/api/comments/${c.id}`, { visibility: "todos" })).status, 400);
  assert.equal((await ana.call("DELETE", `/api/comments/${c.id}`)).status, 200);
  assert.equal((await ana.call("DELETE", `/api/comments/${c.id}`)).status, 404);
  assert.deepEqual((await comments(ana, item.id)).comments, []);
});

test("comentário e item de outro usuário: 404 em tudo, mesmo sendo amigo", async () => {
  const { ana, bia } = await twoFriends();
  const anaItem = await addBook(ana, book, "reading");
  const c = (await ana.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: "Da Ana", visibility: "public" })).json.comment;
  assert.equal((await bia.call("GET", `/api/shelf/${anaItem.id}/comments`)).status, 404);
  assert.equal((await bia.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: "invasão" })).status, 404);
  assert.equal((await bia.call("PATCH", `/api/comments/${c.id}`, { body: "invasão" })).status, 404);
  assert.equal((await bia.call("DELETE", `/api/comments/${c.id}`)).status, 404);
  assert.equal((await comments(ana, anaItem.id)).comments[0].body, "Da Ana");
});

test("na tela do meu livro aparecem os comentários públicos de amigos sobre o mesmo livro, nunca os privados", async () => {
  const { db, ana, bia } = await twoFriends();
  const anaItem = await addBook(ana, book, "read");
  await ana.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: "Público da Ana", visibility: "public" });
  await ana.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: SECRET });
  // mesmo ISBN, outra fonte
  const anaOl = await addBook(ana, { source: "openlibrary", sourceId: "OL-com", title: "Sapiens OL", isbn13: "9788525432186" }, "want");
  await ana.call("POST", `/api/shelf/${anaOl.id}/comments`, { body: "Público na edição OL", visibility: "public" });
  // não amigo com o mesmo livro
  const caio = await login(db, "Caio");
  const caioItem = await addBook(caio, book, "read");
  await caio.call("POST", `/api/shelf/${caioItem.id}/comments`, { body: "Público do Caio", visibility: "public" });

  const biaItem = await addBook(bia, book, "want");
  const r = await bia.call("GET", `/api/shelf/${biaItem.id}/comments`);
  assert.deepEqual(r.json.comments, []);
  assert.deepEqual(r.json.friends.map((c: any) => c.body).sort(), ["Público da Ana", "Público na edição OL"]);
  for (const c of r.json.friends) {
    assert.deepEqual(c.author, { id: ana.user.id, name: "Ana", picture: null });
    assert.deepEqual(Object.keys(c).sort(), ["author", "body", "createdAt", "id", "updatedAt"]);
  }
  const text = JSON.stringify(r.json);
  assert.ok(!text.includes(SECRET));
  assert.ok(!text.includes("Caio"));
  assert.ok(!text.includes("@"));

  // título igual sem ISBN não casa
  const other = await addBook(bia, { source: "manual", title: "Sapiens" }, "want");
  assert.deepEqual((await comments(bia, other.id)).friends, []);
});

test("deixar privado ou desfazer a amizade tira o comentário da vista do amigo", async () => {
  const { ana, bia } = await twoFriends();
  const anaItem = await addBook(ana, book, "reading");
  const c = (await ana.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: "Agora público", visibility: "public" })).json.comment;
  const biaItem = await addBook(bia, book, "reading");
  assert.equal((await comments(bia, biaItem.id)).friends.length, 1);
  await ana.call("PATCH", `/api/comments/${c.id}`, { visibility: "private" });
  assert.equal((await comments(bia, biaItem.id)).friends.length, 0);
  await ana.call("PATCH", `/api/comments/${c.id}`, { visibility: "public" });
  assert.equal((await comments(bia, biaItem.id)).friends.length, 1);
  await bia.call("DELETE", `/api/friends/${ana.user.id}`);
  assert.equal((await comments(bia, biaItem.id)).friends.length, 0);
});

test("tela do amigo traz só os comentários públicos dos livros em Lendo e Lidos", async () => {
  const { ana, bia } = await twoFriends();
  const reading = await addBook(ana, book, "reading");
  await ana.call("POST", `/api/shelf/${reading.id}/comments`, { body: "Velho", visibility: "public" });
  await ana.call("POST", `/api/shelf/${reading.id}/comments`, { body: "Novo", visibility: "public" });
  await ana.call("POST", `/api/shelf/${reading.id}/comments`, { body: SECRET });
  const want = await addBook(ana, { source: "google", sourceId: "com-want", title: "Na fila" }, "want");
  await ana.call("POST", `/api/shelf/${want.id}/comments`, { body: "Comentário de livro na fila", visibility: "public" });
  await addBook(ana, { source: "google", sourceId: "com-read", title: "Sem comentários" }, "read");

  const r = await bia.call("GET", `/api/friends/${ana.user.id}/shelf`);
  assert.equal(r.status, 200);
  const byTitle = Object.fromEntries(r.json.items.map((i: any) => [i.book.title, i]));
  assert.deepEqual(Object.keys(byTitle).sort(), ["Sapiens", "Sem comentários"]);
  assert.deepEqual(byTitle["Sapiens"].comments.map((c: any) => c.body), ["Novo", "Velho"]);
  assert.deepEqual(Object.keys(byTitle["Sapiens"].comments[0]).sort(), ["body", "createdAt", "id", "updatedAt"]);
  assert.deepEqual(byTitle["Sem comentários"].comments, []);
  const text = JSON.stringify(r.json);
  assert.ok(!text.includes(SECRET));
  assert.ok(!text.includes("livro na fila"));
  assert.ok(!text.includes("visibility"));
});

test("remover o livro da estante apaga os comentários dele", async () => {
  const { db, ana, bia } = await twoFriends();
  const anaItem = await addBook(ana, book, "read");
  await ana.call("POST", `/api/shelf/${anaItem.id}/comments`, { body: "Vai sumir", visibility: "public" });
  const biaItem = await addBook(bia, book, "read");
  assert.equal((await comments(bia, biaItem.id)).friends.length, 1);
  assert.equal((await ana.call("DELETE", `/api/shelf/${anaItem.id}`)).status, 200);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM book_comments").get() as any).n, 0);
  assert.equal((await comments(bia, biaItem.id)).friends.length, 0);
});
