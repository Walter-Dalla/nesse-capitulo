import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { addBook, client, invite, login, openDatabase, type Call, type DB, type Session } from "./friends-helpers.ts";
const { TERMS_VERSION } = await import("../server/terms.ts");

const BOOK = { source: "google", sourceId: "vol-1", title: "Dom Casmurro" };

/** Sessão criada direto, sem passar pelo aceite que o helper `login` faz. */
async function withoutTerms(db: DB, email = "nova@x.com"): Promise<Session> {
  const call = client(db);
  const r = await call("POST", "/auth/dev", { name: "Nova", email });
  assert.equal(r.status, 200);
  return { call, user: r.json.user };
}

function assertTermsRequired(r: { status: number; json: any }) {
  assert.equal(r.status, 403);
  assert.equal(r.json.code, "TERMS_REQUIRED");
}

function termsRow(db: DB, id: string) {
  return db.prepare("SELECT terms_version, terms_accepted_at FROM users WHERE id = ?").get(id) as {
    terms_version: number | null;
    terms_accepted_at: string | null;
  };
}

test("termsAccepted em /api/me: sem sessão, antes e depois do aceite", async () => {
  const db = openDatabase(":memory:");
  const anon: Call = client(db);
  assert.equal((await anon("GET", "/api/me")).json.termsAccepted, false);

  const nova = await withoutTerms(db);
  assert.equal((await nova.call("GET", "/api/me")).json.termsAccepted, false);

  assert.equal((await nova.call("POST", "/api/terms/accept")).status, 200);
  const me = await nova.call("GET", "/api/me");
  assert.equal(me.json.termsAccepted, true);
  assert.equal("terms_version" in me.json.user, false);
});

test("POST /api/terms/accept grava a versão, é idempotente e exige sessão", async () => {
  const db = openDatabase(":memory:");
  assert.equal((await client(db)("POST", "/api/terms/accept")).status, 401);

  const nova = await withoutTerms(db);
  const first = await nova.call("POST", "/api/terms/accept");
  assert.equal(first.status, 200);
  assert.deepEqual(first.json, { ok: true });
  const row = termsRow(db, nova.user.id);
  assert.equal(row.terms_version, TERMS_VERSION);
  assert.ok(row.terms_accepted_at);

  db.prepare("UPDATE users SET terms_accepted_at = '2020-01-01 00:00:00' WHERE id = ?").run(nova.user.id);
  const second = await nova.call("POST", "/api/terms/accept");
  assert.equal(second.status, 200);
  assert.deepEqual(second.json, { ok: true });
  assert.equal(termsRow(db, nova.user.id).terms_accepted_at, "2020-01-01 00:00:00");
});

test("versão antiga dos termos pede novo aceite", async () => {
  const db = openDatabase(":memory:");
  const nova = await withoutTerms(db);
  await nova.call("POST", "/api/terms/accept");
  db.prepare("UPDATE users SET terms_version = ? WHERE id = ?").run(TERMS_VERSION - 1, nova.user.id);
  assert.equal((await nova.call("GET", "/api/me")).json.termsAccepted, false);

  assert.equal((await nova.call("POST", "/api/terms/accept")).status, 200);
  assert.equal(termsRow(db, nova.user.id).terms_version, TERMS_VERSION);
  assert.equal((await nova.call("GET", "/api/me")).json.termsAccepted, true);
});

test("comentário público pede aceite ao criar; privado passa sem aceite", async () => {
  const db = openDatabase(":memory:");
  const nova = await withoutTerms(db);
  const item = await addBook(nova, BOOK);
  const url = `/api/shelf/${item.id}/comments`;

  assertTermsRequired(await nova.call("POST", url, { body: "Oi", visibility: "public" }));
  assert.equal(db.prepare("SELECT count(*) AS n FROM book_comments").get()!.n, 0);

  assert.equal((await nova.call("POST", url, { body: "Sem visibilidade" })).status, 201);
  assert.equal((await nova.call("POST", url, { body: "Privado", visibility: "private" })).status, 201);

  await nova.call("POST", "/api/terms/accept");
  assert.equal((await nova.call("POST", url, { body: "Oi", visibility: "public" })).status, 201);
});

test("PATCH de comentário barra pela visibilidade resultante", async () => {
  const db = openDatabase(":memory:");
  const nova = await withoutTerms(db);
  const item = await addBook(nova, BOOK);
  const url = `/api/shelf/${item.id}/comments`;

  const priv = (await nova.call("POST", url, { body: "Privado" })).json.comment;
  // texto de comentário privado passa
  const edited = await nova.call("PATCH", `/api/comments/${priv.id}`, { body: "Editado" });
  assert.equal(edited.status, 200);
  assert.equal(edited.json.comment.body, "Editado");

  // privado para público: barrado, e nada muda
  assertTermsRequired(await nova.call("PATCH", `/api/comments/${priv.id}`, { visibility: "public" }));
  const stored = db.prepare("SELECT visibility FROM book_comments WHERE id = ?").get(priv.id) as { visibility: string };
  assert.equal(stored.visibility, "private");

  // comentário já público: editar só o texto também resulta em público
  await nova.call("POST", "/api/terms/accept");
  const pub = (await nova.call("POST", url, { body: "Público", visibility: "public" })).json.comment;
  db.prepare("UPDATE users SET terms_version = NULL WHERE id = ?").run(nova.user.id);
  assertTermsRequired(await nova.call("PATCH", `/api/comments/${pub.id}`, { body: "Novo texto" }));

  // público para privado: a visibilidade resultante é privada, então passa
  const hidden = await nova.call("PATCH", `/api/comments/${pub.id}`, { visibility: "private" });
  assert.equal(hidden.status, 200);
  assert.equal(hidden.json.comment.visibility, "private");
});

test("convite pede aceite ao criar e ao confirmar; a prévia não", async () => {
  const db = openDatabase(":memory:");
  const nova = await withoutTerms(db);
  const ana = await login(db, "Ana");

  assertTermsRequired(await nova.call("POST", "/api/friends/invites"));
  assert.equal(db.prepare("SELECT count(*) AS n FROM friend_invites WHERE inviter_id = ?").get(nova.user.id)!.n, 0);

  const code = await invite(ana);
  assert.equal((await nova.call("GET", `/api/friends/invites/${code}`)).status, 200);
  assertTermsRequired(await nova.call("POST", `/api/friends/invites/${code}/accept`));
  assert.equal(db.prepare("SELECT count(*) AS n FROM friendships").get()!.n, 0);

  await nova.call("POST", "/api/terms/accept");
  assert.equal((await nova.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
  assert.equal((await nova.call("POST", "/api/friends/invites")).status, 201);
});

test("estante pessoal e exclusão de conta nunca são barradas", async () => {
  const db = openDatabase(":memory:");
  const nova = await withoutTerms(db);
  const item = await addBook(nova, BOOK);
  assert.equal((await nova.call("PATCH", `/api/shelf/${item.id}`, { rating: 5 })).status, 200);
  assert.equal((await nova.call("GET", "/api/shelf")).status, 200);
  assert.equal((await nova.call("DELETE", "/api/account")).status, 200);
});

test("banco antigo, sem as colunas em users, abre e ganha as duas", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estante-termos-"));
  const file = path.join(dir, "antigo.db");
  try {
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE users (
      id TEXT PRIMARY KEY,
      google_sub TEXT UNIQUE,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    old.prepare("INSERT INTO users (id, google_sub) VALUES ('u1', 'dev:u1')").run();
    old.close();

    const db = openDatabase(file);
    const names = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    assert.ok(names.includes("terms_version"));
    assert.ok(names.includes("terms_accepted_at"));
    const row = termsRow(db, "u1");
    assert.equal(row.terms_version, null);
    assert.equal(row.terms_accepted_at, null);
    db.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
