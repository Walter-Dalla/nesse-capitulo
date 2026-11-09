import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, befriend, login, openDatabase, twoFriends, type DB, type Session } from "./friends-helpers.ts";

const book = { source: "google", sourceId: "rep-1", title: "Sapiens", isbn13: "9788525432186" };
const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };

/** Bia tem um comentário público e um privado sobre o livro; Ana e Caio (amigos dela) têm o mesmo livro. */
async function scene() {
  const { db, ana, bia } = await twoFriends();
  const caio = await login(db, "Caio");
  await befriend(bia, caio);
  const biaItem = await addBook(bia, book, "read");
  const anaItem = await addBook(ana, book, "reading");
  const caioItem = await addBook(caio, book, "reading");
  const pub = (await bia.call("POST", `/api/shelf/${biaItem.id}/comments`, { body: "Comentário público", visibility: "public" })).json.comment;
  const priv = (await bia.call("POST", `/api/shelf/${biaItem.id}/comments`, { body: "Comentário privado" })).json.comment;
  return { db, ana, bia, caio, biaItem, anaItem, caioItem, pub, priv };
}

function reports(db: DB) {
  return db.prepare("SELECT reporter_id, reported_user_id, comment_id, comment_body, reason, details, status FROM content_reports ORDER BY rowid").all().map((r) => ({ ...r })) as any[];
}

async function friendComments(s: Session, itemId: string) {
  const r = await s.call("GET", `/api/shelf/${itemId}/comments`);
  assert.equal(r.status, 200);
  return (r.json.friends as any[]).map((c) => c.body);
}

async function shelfComments(s: Session, friendId: string) {
  const r = await s.call("GET", `/api/friends/${friendId}/shelf`);
  assert.equal(r.status, 200);
  return (r.json.items as any[]).flatMap((i) => i.comments.map((c: any) => c.body));
}

test("denunciar comentário: 201, repetição 200 sem duplicar, copia o texto", async () => {
  const { db, ana, bia, pub } = await scene();
  const first = await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "spam", details: "  propaganda  " });
  assert.deepEqual(first, { status: 201, json: { ok: true } });
  const again = await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "harassment" });
  assert.deepEqual(again, { status: 200, json: { ok: true } });
  assert.deepEqual(reports(db), [{
    reporter_id: ana.user.id, reported_user_id: bia.user.id, comment_id: pub.id, comment_body: "Comentário público",
    reason: "spam", details: "propaganda", status: "open",
  }]);
});

test("denunciar usuário amigo: 201, repetição 200; não amigo 404", async () => {
  const { db, ana, bia, caio } = await scene();
  assert.deepEqual(await ana.call("POST", "/api/reports", { userId: bia.user.id, reason: "other" }), { status: 201, json: { ok: true } });
  assert.deepEqual(await ana.call("POST", "/api/reports", { userId: bia.user.id, reason: "other" }), { status: 200, json: { ok: true } });
  assert.deepEqual(await ana.call("POST", "/api/reports", { userId: caio.user.id, reason: "other" }), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("POST", "/api/reports", { userId: ana.user.id, reason: "other" }), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("POST", "/api/reports", { userId: "nao-existe", reason: "other" }), { status: 404, json: NOT_FOUND });
  assert.deepEqual(reports(db).map((r) => [r.reported_user_id, r.comment_id, r.comment_body]), [[bia.user.id, null, null]]);
});

test("comentário privado, de não amigo, próprio ou inexistente dá 404", async () => {
  const { db, ana, bia, caio, caioItem, pub, priv } = await scene();
  const caioComment = (await caio.call("POST", `/api/shelf/${caioItem.id}/comments`, { body: "do Caio", visibility: "public" })).json.comment;
  for (const [who, commentId] of [[ana, priv.id], [ana, caioComment.id], [bia, pub.id], [ana, "nao-existe"]] as const) {
    assert.deepEqual(await who.call("POST", "/api/reports", { commentId, reason: "spam" }), { status: 404, json: NOT_FOUND });
  }
  assert.deepEqual(reports(db), []);
});

test("entrada inválida dá 400: motivo, ambos os ids, nenhum, details acima de 500", async () => {
  const { db, ana, bia, pub } = await scene();
  const reportInvalid = await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "feio" });
  assert.equal(reportInvalid.status, 400);
  assert.equal(reportInvalid.json.code, "REPORT_INVALID");
  assert.equal((await ana.call("POST", "/api/reports", { commentId: pub.id })).json.code, "REPORT_INVALID");
  for (const payload of [
    { commentId: pub.id, userId: bia.user.id, reason: "spam" },
    { reason: "spam" },
    { commentId: "", userId: "", reason: "spam" },
    { commentId: 42, reason: "spam" },
    { commentId: pub.id, reason: "spam", details: "x".repeat(501) },
  ]) {
    const r = await ana.call("POST", "/api/reports", payload);
    assert.equal(r.status, 400, JSON.stringify(payload).slice(0, 60));
    assert.equal(r.json.code, "VALIDATION");
  }
  assert.deepEqual(reports(db), []);
  assert.equal((await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "sexual", details: "x".repeat(500) })).status, 201);
});

test("comentário denunciado some só para quem denunciou, nas duas telas", async () => {
  const { ana, bia, caio, anaItem, caioItem, pub } = await scene();
  assert.deepEqual(await friendComments(ana, anaItem.id), ["Comentário público"]);
  assert.deepEqual(await shelfComments(ana, bia.user.id), ["Comentário público"]);
  assert.equal((await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "harassment" })).status, 201);
  assert.deepEqual(await friendComments(ana, anaItem.id), []);
  assert.deepEqual(await shelfComments(ana, bia.user.id), []);
  assert.deepEqual(await friendComments(caio, caioItem.id), ["Comentário público"]);
  assert.deepEqual(await shelfComments(caio, bia.user.id), ["Comentário público"]);
});

test("autor apaga o comentário: denúncia fica com o texto e comment_id nulo", async () => {
  const { db, ana, bia, pub } = await scene();
  await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "spam" });
  assert.equal((await bia.call("DELETE", `/api/comments/${pub.id}`)).status, 200);
  assert.deepEqual(reports(db).map((r) => [r.comment_id, r.comment_body]), [[null, "Comentário público"]]);
  // a denúncia do comentário apagado não conta como denúncia do usuário
  assert.equal((await ana.call("POST", "/api/reports", { userId: bia.user.id, reason: "other" })).status, 201);
});

test("autor exclui a conta: a denúncia some", async () => {
  const { db, ana, bia, pub } = await scene();
  await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "spam" });
  assert.equal((await bia.call("DELETE", "/api/account")).status, 200);
  assert.deepEqual(reports(db), []);
});

test("quem denunciou exclui a conta: a denúncia fica sem reporter_id", async () => {
  const { db, ana, bia, pub } = await scene();
  await ana.call("POST", "/api/reports", { commentId: pub.id, reason: "spam" });
  assert.equal((await ana.call("DELETE", "/api/account")).status, 200);
  assert.deepEqual(reports(db).map((r) => [r.reporter_id, r.reported_user_id, r.comment_id]), [[null, bia.user.id, pub.id]]);
});

test("sem sessão: 401", async () => {
  const { client } = await import("./friends-helpers.ts");
  const r = await client(openDatabase(":memory:"))("POST", "/api/reports", { userId: "x", reason: "spam" });
  assert.equal(r.status, 401);
});
