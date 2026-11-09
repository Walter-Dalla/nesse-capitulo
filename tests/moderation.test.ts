import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { addBook, befriend, client, invite, login, openDatabase, twoFriends, type DB, type Session } from "./friends-helpers.ts";

const { decodeIdToken } = await import("../server/auth.ts");

const MOD_EMAIL = "walterdallaprofissional@gmail.com";
const book = { source: "google", sourceId: "mod-1", title: "Sapiens", isbn13: "9788525432186" };
const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };

/** Ana e Bia amigas com o mesmo livro; Bia comenta em público e Ana denuncia o comentário. Mod modera. */
async function scene() {
  const { db, ana, bia } = await twoFriends();
  const mod = await login(db, "Mod", MOD_EMAIL);
  const anaItem = await addBook(ana, book, "reading");
  const biaItem = await addBook(bia, book, "read");
  const comment = (await bia.call("POST", `/api/shelf/${biaItem.id}/comments`, { body: "Comentário ofensivo", visibility: "public" })).json.comment;
  assert.equal((await ana.call("POST", "/api/reports", { commentId: comment.id, reason: "harassment", details: "ofende" })).status, 201);
  const list = await mod.call("GET", "/api/mod/reports");
  assert.equal(list.status, 200);
  return { db, ana, bia, mod, anaItem, biaItem, comment, report: list.json.reports[0] };
}

function reportRow(db: DB, id: string) {
  const row = db.prepare("SELECT status, comment_id, comment_body FROM content_reports WHERE id = ?").get(id);
  return { ...row } as { status: string; comment_id: string | null; comment_body: string | null };
}

function idToken(claims: Record<string, unknown>) {
  return `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;
}

async function me(s: Session) {
  return (await s.call("GET", "/api/me")).json;
}

test("usuário comum recebe 404 nas rotas de moderação e isModerator false", async () => {
  const { ana, report } = await scene();
  assert.equal((await me(ana)).isModerator, false);
  assert.deepEqual(await ana.call("GET", "/api/mod/reports"), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("GET", "/api/mod/reports?status=xyz"), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("POST", `/api/mod/reports/${report.id}/resolve`, { action: "dismiss" }), { status: 404, json: NOT_FOUND });
  // sem sessão: 401, e /api/me diz false
  const anon = client(openDatabase(":memory:"));
  assert.equal((await anon("GET", "/api/mod/reports")).status, 401);
  assert.equal((await anon("GET", "/api/me")).json.isModerator, false);
});

test("moderador lista as denúncias abertas, mais antigas primeiro, e isModerator true (também com maiúsculas)", async () => {
  const { db, ana, bia, mod, comment, report } = await scene();
  assert.equal((await me(mod)).isModerator, true);
  const upper = await login(db, "Mod2", "WalterDallaProfissional@Gmail.COM");
  assert.equal((await me(upper)).isModerator, true);
  assert.deepEqual(report, {
    id: report.id,
    reason: "harassment",
    details: "ofende",
    status: "open",
    createdAt: report.createdAt,
    commentId: comment.id,
    commentBody: "Comentário ofensivo",
    reporter: { id: ana.user.id, name: "Ana" },
    reported: { id: bia.user.id, name: "Bia", email: "bia@x.com" },
  });
  await ana.call("POST", "/api/reports", { userId: bia.user.id, reason: "spam" });
  const open = (await mod.call("GET", "/api/mod/reports?status=open")).json.reports;
  assert.deepEqual(open.map((r: any) => [r.reason, r.commentId]), [["harassment", comment.id], ["spam", null]]);
  assert.deepEqual((await mod.call("GET", "/api/mod/reports?status=dismissed")).json, { reports: [] });
  const bad = await mod.call("GET", "/api/mod/reports?status=todas");
  assert.equal(bad.status, 400);
  assert.equal(bad.json.code, "REPORT_INVALID");
});

test("dismiss: status dismissed, comentário fica; repetir dá 200 sem mudar nada", async () => {
  const { db, mod, report, comment } = await scene();
  assert.deepEqual(await mod.call("POST", `/api/mod/reports/${report.id}/resolve`, { action: "dismiss" }), { status: 200, json: { ok: true } });
  assert.deepEqual(reportRow(db, report.id), { status: "dismissed", comment_id: comment.id, comment_body: "Comentário ofensivo" });
  assert.deepEqual(await mod.call("POST", `/api/mod/reports/${report.id}/resolve`, { action: "remove_comment" }), { status: 200, json: { ok: true } });
  assert.deepEqual(reportRow(db, report.id), { status: "dismissed", comment_id: comment.id, comment_body: "Comentário ofensivo" });
  assert.deepEqual((await mod.call("GET", "/api/mod/reports?status=dismissed")).json.reports.map((r: any) => r.id), [report.id]);
});

test("remove_comment: apaga o comentário, status actioned, comment_body fica", async () => {
  const { db, bia, mod, report, comment } = await scene();
  assert.deepEqual(await mod.call("POST", `/api/mod/reports/${report.id}/resolve`, { action: "remove_comment" }), { status: 200, json: { ok: true } });
  assert.deepEqual(reportRow(db, report.id), { status: "actioned", comment_id: null, comment_body: "Comentário ofensivo" });
  assert.equal(db.prepare("SELECT 1 FROM book_comments WHERE id = ?").get(comment.id), undefined);
  assert.equal((await bia.call("GET", "/api/me")).status, 200);
});

test("ação inválida 400 REPORT_INVALID; denúncia inexistente 404", async () => {
  const { mod, report } = await scene();
  for (const body of [{ action: "apagar" }, {}]) {
    const r = await mod.call("POST", `/api/mod/reports/${report.id}/resolve`, body);
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "REPORT_INVALID");
  }
  assert.deepEqual(await mod.call("POST", "/api/mod/reports/nao-existe/resolve", { action: "dismiss" }), { status: 404, json: NOT_FOUND });
});

test("ban_user: banido perde a sessão (401), novo login dá 403, amigo deixa de vê-lo e ao comentário", async () => {
  const { db, ana, bia, mod, anaItem, report } = await scene();
  const code = await invite(bia);
  const caio = await login(db, "Caio");
  await befriend(caio, bia);
  assert.deepEqual((await ana.call("GET", `/api/shelf/${anaItem.id}/comments`)).json.friends, []); // Ana denunciou: já não via
  const caioItem = await addBook(caio, book, "reading");
  assert.equal((await caio.call("GET", `/api/shelf/${caioItem.id}/comments`)).json.friends.length, 1);

  assert.deepEqual(await mod.call("POST", `/api/mod/reports/${report.id}/resolve`, { action: "ban_user" }), { status: 200, json: { ok: true } });
  assert.equal(reportRow(db, report.id).status, "actioned");
  const user = db.prepare("SELECT banned_at FROM users WHERE id = ?").get(bia.user.id) as { banned_at: string | null };
  assert.ok(user.banned_at);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(bia.user.id)!.n, 0);

  assert.equal((await bia.call("GET", "/api/friends")).status, 401);
  assert.equal((await me(bia)).user, null);
  const again = await client(db)("POST", "/auth/dev", { name: "Bia", email: "bia@x.com" });
  assert.equal(again.status, 403);
  assert.ok(again.json.error);

  for (const [s, item] of [[ana, anaItem], [caio, caioItem]] as const) {
    assert.deepEqual(((await s.call("GET", "/api/friends")).json.friends as any[]).map((f) => f.id), []);
    assert.deepEqual(await s.call("GET", `/api/friends/${bia.user.id}/shelf`), { status: 404, json: NOT_FOUND });
    assert.deepEqual((await s.call("GET", `/api/shelf/${item.id}/comments`)).json.friends, []);
  }
  // convite aberto do banido não recria a amizade
  const dan = await login(db, "Dan");
  assert.equal((await dan.call("GET", `/api/friends/invites/${code}`)).status, 404);
  assert.equal((await dan.call("POST", `/api/friends/invites/${code}/accept`)).status, 404);
});

test("banir moderador dá 400 REPORT_INVALID e não muda nada", async () => {
  const { db, ana, mod } = await scene();
  await befriend(ana, mod);
  assert.equal((await ana.call("POST", "/api/reports", { userId: mod.user.id, reason: "other" })).status, 201);
  const target = (await mod.call("GET", "/api/mod/reports")).json.reports.find((r: any) => r.reported.id === mod.user.id);
  const r = await mod.call("POST", `/api/mod/reports/${target.id}/resolve`, { action: "ban_user" });
  assert.equal(r.status, 400);
  assert.equal(r.json.code, "REPORT_INVALID");
  assert.equal(reportRow(db, target.id).status, "open");
  assert.equal((await me(mod)).isModerator, true);
});

test("denunciante que excluiu a conta aparece como reporter null", async () => {
  const { ana, mod, report } = await scene();
  await ana.call("DELETE", "/api/account");
  const list = (await mod.call("GET", "/api/mod/reports")).json.reports;
  assert.deepEqual(list.map((r: any) => [r.id, r.reporter]), [[report.id, null]]);
});

test("decodeIdToken só passa o e-mail verificado", () => {
  const base = { sub: "123", email: MOD_EMAIL, name: "X" };
  assert.equal(decodeIdToken(idToken({ ...base, email_verified: false })).email, undefined);
  assert.equal(decodeIdToken(idToken({ ...base, email_verified: "false" })).email, undefined);
  assert.equal(decodeIdToken(idToken(base)).email, undefined);
  assert.equal(decodeIdToken(idToken({ ...base, email_verified: true })).email, MOD_EMAIL);
  assert.equal(decodeIdToken(idToken({ ...base, email_verified: "true" })).email, MOD_EMAIL);
  assert.equal(decodeIdToken(idToken({ ...base, email_verified: false })).sub, "123");
});

test("arquivo antigo sem banned_at abre e ganha a coluna", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "estante-ban-"));
  const file = path.join(dir, "old.db");
  try {
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, google_sub TEXT UNIQUE, email TEXT, name TEXT, picture TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO users (id, google_sub, email, name) VALUES ('u1', 'dev:a', 'a@x.com', 'A');`);
    old.close();
    const db = openDatabase(file);
    const cols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
    assert.ok(cols.includes("banned_at"));
    assert.equal((db.prepare("SELECT banned_at FROM users WHERE id = 'u1'").get() as any).banned_at, null);
    db.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** Bane `userId` direto no banco (o caminho do moderador já é coberto acima). */
function ban(db: DB, userId: string) {
  db.prepare("UPDATE users SET banned_at = datetime('now') WHERE id = ?").run(userId);
}

function sessionCount(db: DB) {
  return (db.prepare("SELECT COUNT(*) AS n FROM sessions").get() as { n: number }).n;
}

/** Troca `fetch` por um stub que responde `body` em JSON, sem rede; devolve a função que restaura. */
function stubFetch(body: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

const { env } = await import("../server/env.ts");
const { createApp } = await import("../server/app.ts");

test("banido no login nativo: POST /auth/google/token dá 403 sem criar sessão", async () => {
  const db = openDatabase(":memory:");
  const prevId = env.google.clientId;
  env.google.clientId = "app-client";
  const restore = stubFetch({
    sub: "g-banido", email: "ban@x.com", email_verified: "true", name: "Ban",
    aud: "app-client", iss: "https://accounts.google.com", exp: String(Math.floor(Date.now() / 1000) + 3600),
  });
  try {
    const first = await client(db)("POST", "/auth/google/token", { idToken: "qualquer" });
    assert.equal(first.status, 200);
    ban(db, first.json.user.id);
    const before = sessionCount(db);
    const again = await client(db)("POST", "/auth/google/token", { idToken: "qualquer" });
    assert.equal(again.status, 403);
    assert.deepEqual(Object.keys(again.json), ["error"]);
    assert.equal(sessionCount(db), before);
  } finally {
    restore();
    env.google.clientId = prevId;
  }
});

test("banido no callback do Google: redireciona /login?error=banned sem criar sessão", async () => {
  const db = openDatabase(":memory:");
  const restore = stubFetch({ id_token: idToken({ sub: "g-cb", email: "cb@x.com", email_verified: true, name: "Cb" }) });
  const app = createApp(db);
  const callback = () => app.request("/auth/google/callback?code=c&state=s", { headers: { Cookie: "oauth_state=s", Host: "localhost:3000" } });
  try {
    const ok = await callback();
    assert.equal(ok.status, 302);
    assert.equal(ok.headers.get("location"), "/");
    const user = db.prepare("SELECT id FROM users WHERE google_sub = 'g-cb'").get() as { id: string };
    ban(db, user.id);
    db.prepare("DELETE FROM sessions").run();
    const banned = await callback();
    assert.equal(banned.status, 302);
    assert.equal(banned.headers.get("location"), "/login?error=banned");
    assert.equal(sessionCount(db), 0);
  } finally {
    restore();
  }
});

test("convite de quem foi banido dá 404 INVITE_INVALID no GET e no accept", async () => {
  const db = openDatabase(":memory:");
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  const code = await invite(ana);
  ban(db, ana.user.id);
  const expected = { status: 404, json: { error: "Convite inválido ou já usado", code: "INVITE_INVALID" } };
  assert.deepEqual(await bia.call("GET", `/api/friends/invites/${code}`), expected);
  assert.deepEqual(await bia.call("POST", `/api/friends/invites/${code}/accept`), expected);
  assert.equal(db.prepare("SELECT 1 FROM friendships").get(), undefined);
});
