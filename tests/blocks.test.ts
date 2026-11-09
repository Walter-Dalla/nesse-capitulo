import { test } from "node:test";
import assert from "node:assert/strict";
import { addBook, befriend, invite, login, twoFriends, type Session } from "./friends-helpers.ts";

const book = { source: "google", sourceId: "blk-1", title: "Sapiens", isbn13: "9788525432186" };
const NOT_FOUND = { error: "Não encontrado", code: "NOT_FOUND" };
const INVITE_INVALID = { status: 404, json: { error: "Convite inválido ou já usado", code: "INVITE_INVALID" } };

async function friendIds(s: Session) {
  return ((await s.call("GET", "/api/friends")).json.friends as any[]).map((f) => f.id);
}

/** Ana e Bia amigas, cada uma com o mesmo livro (lido) e um comentário público sobre ele. */
async function scene() {
  const { db, ana, bia } = await twoFriends();
  const items: Record<string, any> = {};
  for (const s of [ana, bia]) {
    const item = await addBook(s, book, "read");
    items[s.user.id] = item;
    await s.call("POST", `/api/shelf/${item.id}/comments`, { body: `Comentário de ${s.user.name}`, visibility: "public" });
  }
  return { db, ana, bia, items };
}

test("depois de bloquear, nenhum dos dois vê o outro: amigos, estante, comentários e selo", async () => {
  const { ana, bia, items } = await scene();
  const anaItem = items[ana.user.id];
  const biaItem = items[bia.user.id];
  // antes: tudo visível
  assert.deepEqual(await friendIds(ana), [bia.user.id]);
  assert.equal((await ana.call("GET", "/api/friends/badges")).json.badges[anaItem.id], 1);
  assert.equal((await ana.call("GET", `/api/shelf/${anaItem.id}/comments`)).json.friends.length, 1);

  assert.deepEqual(await ana.call("POST", `/api/friends/${bia.user.id}/block`), { status: 200, json: { ok: true } });

  for (const [me, other, myItem] of [[ana, bia, anaItem], [bia, ana, biaItem]] as const) {
    assert.deepEqual(await friendIds(me), []);
    assert.deepEqual(await me.call("GET", `/api/friends/${other.user.id}/shelf`), { status: 404, json: NOT_FOUND });
    assert.deepEqual((await me.call("GET", `/api/shelf/${myItem.id}/comments`)).json.friends, []);
    assert.deepEqual((await me.call("GET", "/api/friends/badges")).json.badges, {});
    assert.deepEqual((await me.call("GET", `/api/shelf/${myItem.id}/friends`)).json.friends, []);
  }
});

test("convite aberto do bloqueado e do bloqueador dá 404 INVITE_INVALID no GET e no accept, para os dois", async () => {
  const { ana, bia } = await twoFriends();
  const fromAna = await invite(ana);
  const fromBia = await invite(bia);
  assert.equal((await ana.call("POST", `/api/friends/${bia.user.id}/block`)).status, 200);
  for (const [who, code] of [[bia, fromAna], [ana, fromBia]] as const) {
    assert.deepEqual(await who.call("GET", `/api/friends/invites/${code}`), INVITE_INVALID);
    assert.deepEqual(await who.call("POST", `/api/friends/invites/${code}/accept`), INVITE_INVALID);
  }
});

test("bloqueio não afeta terceiros: convite do bloqueador segue valendo para outra pessoa", async () => {
  const { db, ana, bia } = await twoFriends();
  const caio = await login(db, "Caio");
  const code = await invite(ana);
  await ana.call("POST", `/api/friends/${bia.user.id}/block`);
  assert.equal((await caio.call("POST", `/api/friends/invites/${code}/accept`)).status, 201);
  assert.deepEqual(await friendIds(ana), [caio.user.id]);
});

test("desbloquear não refaz a amizade; um convite novo volta a funcionar", async () => {
  const { ana, bia } = await twoFriends();
  await ana.call("POST", `/api/friends/${bia.user.id}/block`);
  // só quem bloqueou desbloqueia
  assert.deepEqual(await bia.call("DELETE", `/api/friends/blocks/${ana.user.id}`), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("DELETE", `/api/friends/blocks/${bia.user.id}`), { status: 200, json: { ok: true } });
  assert.deepEqual(await friendIds(ana), []);
  assert.deepEqual(await friendIds(bia), []);
  assert.deepEqual(await ana.call("DELETE", `/api/friends/blocks/${bia.user.id}`), { status: 404, json: NOT_FOUND });
  await befriend(bia, ana);
  assert.deepEqual(await friendIds(ana), [bia.user.id]);
});

test("bloquear quem não é amigo dá 404", async () => {
  const { db, ana } = await twoFriends();
  const caio = await login(db, "Caio");
  assert.deepEqual(await ana.call("POST", `/api/friends/${caio.user.id}/block`), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("POST", `/api/friends/${ana.user.id}/block`), { status: 404, json: NOT_FOUND });
  assert.deepEqual(await ana.call("POST", "/api/friends/nao-existe/block"), { status: 404, json: NOT_FOUND });
  assert.deepEqual((await ana.call("GET", "/api/friends/blocks")).json, { blocks: [] });
});

test("lista de bloqueios: só os meus, com id, name e picture, sem email", async () => {
  const { db, ana, bia } = await twoFriends();
  const caio = await login(db, "Caio");
  await befriend(ana, caio);
  await befriend(bia, caio);
  await ana.call("POST", `/api/friends/${caio.user.id}/block`);
  await ana.call("POST", `/api/friends/${bia.user.id}/block`);
  const mine = await ana.call("GET", "/api/friends/blocks");
  assert.equal(mine.status, 200);
  assert.deepEqual(mine.json, {
    blocks: [
      { id: bia.user.id, name: "Bia", picture: null },
      { id: caio.user.id, name: "Caio", picture: null },
    ],
  });
  assert.deepEqual((await bia.call("GET", "/api/friends/blocks")).json, { blocks: [] });
  assert.deepEqual((await caio.call("GET", "/api/friends/blocks")).json, { blocks: [] });
  // Bia e Caio seguem amigos
  assert.deepEqual(await friendIds(bia), [caio.user.id]);
});
