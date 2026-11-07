import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addBook, befriend, client, invite, login, openDatabase, twoFriends } from "./friends-helpers.ts";

const INVALID = "Convite inválido ou já usado";

test("gerar convite devolve só o código, sem validade", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const r = await ana.call("POST", "/api/friends/invites");
  assert.equal(r.status, 201);
  assert.deepEqual(Object.keys(r.json), ["code"]);
  assert.equal(typeof r.json.code, "string");
  assert.ok(r.json.code.length >= 20);
  // vários convites abertos convivem
  const other = await ana.call("POST", "/api/friends/invites");
  assert.notEqual(other.json.code, r.json.code);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM friend_invites").get() as any).n, 2);
});

test("convite não expira: um convite de anos atrás continua valendo", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  db.prepare("UPDATE friend_invites SET created_at = '2000-01-01 00:00:00'").run();
  // criar outros convites não apaga os antigos
  await invite(ana);
  const get = await bia.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 200);
  assert.equal(get.json.alreadyFriends, false);
  assert.equal((await bia.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
});

test("banco com a coluna de validade antiga: a migração tira a coluna e o convite vencido volta a valer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "estante-convite-"));
  try {
    const file = join(dir, "t.db");
    const old = openDatabase(file);
    old.exec("DROP TABLE friend_invites");
    old.exec(`CREATE TABLE friend_invites (
      code TEXT PRIMARY KEY,
      inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      used_by TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    old.prepare("INSERT INTO users (id, name) VALUES ('ana', 'Ana')").run();
    old.prepare("INSERT INTO friend_invites (code, inviter_id, expires_at) VALUES ('velho', 'ana', 0)").run();
    old.close();

    const db = openDatabase(file);
    const cols = (db.prepare("PRAGMA table_info(friend_invites)").all() as any[]).map((c) => c.name);
    assert.ok(!cols.includes("expires_at"));
    const bia = await login(db, "Bia");
    assert.equal((await bia.call("GET", "/api/friends/invites/velho")).status, 200);
    assert.equal((await bia.call("POST", "/api/friends/invites/velho/accept")).status, 201);
    const ana = await login(db, "Ana2");
    assert.equal((await ana.call("POST", "/api/friends/invites")).status, 201);
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("passo 1: código inexistente dá 404 nas duas rotas", async () => {
  const db = openDatabase(":memory:");
  const bia = await login(db, "Bia");
  for (const path of ["/api/friends/invites/nao-existe", "/api/friends/invites/nao-existe/accept"]) {
    const r = await bia.call(path.endsWith("accept") ? "POST" : "GET", path);
    assert.equal(r.status, 404);
    assert.deepEqual(r.json, { error: INVALID });
  }
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends, []);
});

test("passo 2: o próprio convite dá 400 INVITE_SELF nas duas rotas, sem consumir", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  const get = await ana.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 400);
  assert.deepEqual(get.json, { error: "Este convite é seu", code: "INVITE_SELF" });
  const accept = await ana.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(accept.status, 400);
  assert.deepEqual(accept.json, { error: "Este convite é seu", code: "INVITE_SELF" });
  assert.equal((db.prepare("SELECT used_by FROM friend_invites WHERE code = ?").get(code) as any).used_by, null);
  // continua valendo para outra pessoa
  assert.equal((await bia.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
});

test("passo 6 e GET que não consome: prévia mostra quem convidou, sem criar amizade", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  for (let i = 0; i < 3; i++) {
    const get = await bia.call("GET", `/api/friends/invites/${code}`);
    assert.equal(get.status, 200);
    assert.deepEqual(get.json, { inviter: { id: ana.user.id, name: "Ana", picture: null }, alreadyFriends: false });
  }
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends, []);
  assert.deepEqual((await ana.call("GET", "/api/friends")).json.friends, []);
  assert.equal((db.prepare("SELECT used_by FROM friend_invites WHERE code = ?").get(code) as any).used_by, null);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM friendships").get() as any).n, 0);

  const accept = await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(accept.status, 201);
  assert.deepEqual(accept.json, { friend: { id: ana.user.id, name: "Ana", picture: null } });
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends.map((f: any) => f.id), [ana.user.id]);
  assert.deepEqual((await ana.call("GET", "/api/friends")).json.friends.map((f: any) => f.id), [bia.user.id]);
});

test("passo 3: quem já usou recebe alreadyFriends nas duas rotas (toque duplo), sem duplicar", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  assert.equal((await bia.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
  const again = await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(again.status, 200);
  assert.deepEqual(again.json, { friend: { id: ana.user.id, name: "Ana", picture: null } });
  const get = await bia.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 200);
  assert.equal(get.json.alreadyFriends, true);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM friendships").get() as any).n, 1);
});

test("passo 3: reabrir o convite depois de desfazer a amizade dá 404 e não refaz", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal((await bia.call("DELETE", `/api/friends/${ana.user.id}`)).status, 200);
  const get = await bia.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 404);
  assert.equal(get.json.error, INVALID);
  const accept = await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(accept.status, 404);
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends, []);
});

test("passo 4: link usado vale para uma pessoa só; terceiro recebe 404 nas duas rotas", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const caio = await login(db, "Caio");
  const code = await invite(ana);
  await bia.call("POST", `/api/friends/invites/${code}/accept`);
  const get = await caio.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 404);
  assert.equal(get.json.error, INVALID);
  const accept = await caio.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(accept.status, 404);
  assert.deepEqual((await caio.call("GET", "/api/friends")).json.friends, []);
  assert.deepEqual((await ana.call("GET", "/api/friends")).json.friends.map((f: any) => f.id), [bia.user.id]);
});

test("passo 5: já amigos por outro convite recebem alreadyFriends nas duas rotas, sem consumir", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  await befriend(ana, bia);
  const code = await invite(ana);
  const get = await bia.call("GET", `/api/friends/invites/${code}`);
  assert.equal(get.status, 200);
  assert.deepEqual(get.json, { inviter: { id: ana.user.id, name: "Ana", picture: null }, alreadyFriends: true });
  const accept = await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.equal(accept.status, 200);
  assert.equal(accept.json.friend.id, ana.user.id);
  assert.equal((db.prepare("SELECT used_by FROM friend_invites WHERE code = ?").get(code) as any).used_by, null);
  // o convite segue aberto para outra pessoa
  const caio = await login(db, "Caio");
  assert.equal((await caio.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
});

test("sem sessão: 401 na prévia, no accept e na criação de convite", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const code = await invite(ana);
  const anon = client(db);
  assert.equal((await anon("GET", `/api/friends/invites/${code}`)).status, 401);
  assert.equal((await anon("POST", `/api/friends/invites/${code}/accept`)).status, 401);
  assert.equal((await anon("POST", "/api/friends/invites")).status, 401);
  assert.equal((await anon("GET", "/api/friends")).status, 401);
  assert.equal((db.prepare("SELECT used_by FROM friend_invites WHERE code = ?").get(code) as any).used_by, null);
});

test("desfazer amizade funciona dos dois lados e dá 404 para quem não é amigo", async () => {
  const { db, ana, bia } = await twoFriends();
  const caio = await login(db, "Caio");
  assert.equal((await ana.call("DELETE", `/api/friends/${caio.user.id}`)).status, 404);
  assert.equal((await ana.call("DELETE", `/api/friends/${ana.user.id}`)).status, 404);
  const del = await ana.call("DELETE", `/api/friends/${bia.user.id}`);
  assert.equal(del.status, 200);
  assert.deepEqual(del.json, { ok: true });
  assert.deepEqual((await bia.call("GET", "/api/friends")).json.friends, []);
  assert.equal((await bia.call("DELETE", `/api/friends/${ana.user.id}`)).status, 404);

  // o outro lado também pode desfazer
  await befriend(ana, bia);
  assert.equal((await bia.call("DELETE", `/api/friends/${ana.user.id}`)).status, 200);
  assert.deepEqual((await ana.call("GET", "/api/friends")).json.friends, []);
});

test("inviter e friend não trazem e-mail", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana", "ana.secreta@x.com");
  const bia = await login(db, "Bia", "bia.secreta@x.com");
  const code = await invite(ana);
  const get = await bia.call("GET", `/api/friends/invites/${code}`);
  assert.deepEqual(Object.keys(get.json.inviter).sort(), ["id", "name", "picture"]);
  const accept = await bia.call("POST", `/api/friends/invites/${code}/accept`);
  assert.deepEqual(Object.keys(accept.json.friend).sort(), ["id", "name", "picture"]);
  for (const body of [get.json, accept.json, (await ana.call("GET", "/api/friends")).json]) {
    assert.ok(!JSON.stringify(body).includes("secreta"));
  }
});

test("com amizade, GET /api/shelf continua só com os meus itens", async () => {
  const { ana, bia } = await twoFriends();
  await addBook(ana, { source: "google", sourceId: "g-ana", title: "Da Ana" }, "read");
  await addBook(bia, { source: "google", sourceId: "g-bia", title: "Da Bia" }, "reading");
  const shelf = await bia.call("GET", "/api/shelf");
  assert.deepEqual(shelf.json.items.map((i: any) => i.book.title), ["Da Bia"]);
  const anaShelf = await ana.call("GET", "/api/shelf");
  assert.deepEqual(anaShelf.json.items.map((i: any) => i.book.title), ["Da Ana"]);
});

test("schema rejeita par invertido e amizade consigo mesmo", () => {
  const db = openDatabase(":memory:");
  db.prepare("INSERT INTO users (id) VALUES ('a'), ('b')").run();
  db.prepare("INSERT INTO friendships (user_low, user_high) VALUES ('a', 'b')").run();
  assert.throws(() => db.prepare("INSERT INTO friendships (user_low, user_high) VALUES ('b', 'a')").run());
  assert.throws(() => db.prepare("INSERT INTO friendships (user_low, user_high) VALUES ('a', 'a')").run());
});
