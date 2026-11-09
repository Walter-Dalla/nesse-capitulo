import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, befriend, client, invite, login, openDatabase, type DB } from "./friends-helpers.ts";
const { createApp } = await import("../server/app.ts");

const HEADERS = { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" };
const GOOGLE = { source: "google", sourceId: "vol-1", title: "Dom Casmurro" };

/** Sessão extra da pessoa, com o cookie exposto: `client` troca o cookie pelo que a resposta devolve. */
async function rawSession(db: DB, email: string) {
  const app = createApp(db);
  const res = await app.request("/auth/dev", { method: "POST", headers: HEADERS, body: JSON.stringify({ email }) });
  const cookie = res.headers.get("set-cookie")!.split(";")[0];
  return (method: string, path: string) => app.request(path, { method, headers: { ...HEADERS, Cookie: cookie } });
}

function rows(db: DB, table: string, where: string, id: string) {
  const params = Array.from({ length: where.split("?").length - 1 }, () => id);
  return (db.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).get(...params) as { n: number }).n;
}

function bookExists(db: DB, id: string) {
  return db.prepare("SELECT 1 FROM books WHERE id = ?").get(id) !== undefined;
}

test("DELETE /api/account apaga a pessoa e tudo dela; o amigo fica sem ela", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  await befriend(ana, bia);
  await invite(ana); // convite aberto dela
  const carla = await login(db, "Carla");
  const accepted = await ana.call("POST", `/api/friends/invites/${await invite(carla)}/accept`); // used_by dela
  assert.equal(accepted.status, 201);

  const anaGoogle = await addBook(ana, GOOGLE);
  const anaManual = await addBook(ana, { source: "manual", title: "Diário da Ana" });
  const biaGoogle = await addBook(bia, GOOGLE);
  const comment = await ana.call("POST", `/api/shelf/${anaGoogle.id}/comments`, { body: "Capitu!", visibility: "public" });
  assert.equal(comment.status, 201);

  // antes: o amigo vê a pessoa e o comentário dela
  assert.equal((await bia.call("GET", "/api/friends")).json.friends.length, 1);
  const before = await bia.call("GET", `/api/shelf/${biaGoogle.id}/comments`);
  assert.deepEqual(before.json.friends.map((c: any) => c.body), ["Capitu!"]);

  const same = await rawSession(db, "ana@x.com");
  const res = await same("DELETE", "/api/account");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });

  const setCookie = res.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /^sid=;/);
  assert.match(setCookie, /Max-Age=0/);
  assert.match(setCookie, /Path=\//);

  // a mesma sessão e a outra sessão da pessoa morrem
  assert.equal((await same("GET", "/api/shelf")).status, 401);
  assert.equal((await ana.call("GET", "/api/shelf")).status, 401);

  const id = ana.user.id;
  assert.equal(rows(db, "users", "id = ?", id), 0);
  assert.equal(rows(db, "sessions", "user_id = ?", id), 0);
  assert.equal(rows(db, "user_books", "user_id = ?", id), 0);
  assert.equal(rows(db, "book_comments", "user_id = ?", id), 0);
  assert.equal(rows(db, "friendships", "user_low = ? OR user_high = ?", id), 0);
  assert.equal(rows(db, "friend_invites", "inviter_id = ? OR used_by = ?", id), 0);

  // o amigo não a vê mais, nem o comentário público dela
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends, []);
  assert.equal((await bia.call("GET", `/api/friends/${id}/shelf`)).status, 404);
  assert.deepEqual((await bia.call("GET", `/api/shelf/${biaGoogle.id}/comments`)).json.friends, []);

  // livro manual dela some; livro google fica, e segue na estante do amigo
  assert.equal(bookExists(db, anaManual.book.id), false);
  assert.equal(bookExists(db, anaGoogle.book.id), true);
  assert.equal((await bia.call("GET", `/api/shelf/${biaGoogle.id}`)).status, 200);

  // os dados de quem ficou seguem inteiros
  assert.equal(rows(db, "users", "id = ?", bia.user.id), 1);
  assert.equal(rows(db, "users", "id = ?", carla.user.id), 1);
});

test("DELETE /api/account sem sessão dá 401 e não apaga ninguém", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const anon = client(db);
  assert.equal((await anon("DELETE", "/api/account")).status, 401);
  assert.equal(rows(db, "users", "id = ?", ana.user.id), 1);
});
