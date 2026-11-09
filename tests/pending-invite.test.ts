import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PENDING_INVITE_TTL_MS, clearPendingInvite, inviteCodeFromPath, pendingInviteRedirect, readPendingInvite, savePendingInvite,
  type InviteStore,
} from "../client/src/lib/pendingInvite.ts";
import { displayName, friendsReadChip, friendsReadText } from "../client/src/lib/format.ts";
import { setLocale } from "../client/src/lib/i18n.ts";

setLocale("pt");

function memory(): InviteStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

const broken: InviteStore = {
  getItem: () => { throw new Error("bloqueado"); },
  setItem: () => { throw new Error("bloqueado"); },
  removeItem: () => { throw new Error("bloqueado"); },
};

test("ida e volta do convite guardado", () => {
  const store = memory();
  assert.equal(readPendingInvite(store), null);
  savePendingInvite(store, "abc", 1000);
  assert.equal(readPendingInvite(store, 1000), "abc");
  assert.equal(readPendingInvite(store, 1000 + PENDING_INVITE_TTL_MS), "abc");
  clearPendingInvite(store);
  assert.equal(readPendingInvite(store, 1000), null);
});

test("convite guardado vence depois de 1 h e é removido", () => {
  const store = memory();
  savePendingInvite(store, "abc", 1000);
  assert.equal(readPendingInvite(store, 1000 + PENDING_INVITE_TTL_MS + 1), null);
  assert.equal(store.map.size, 0);
  // relógio que voltou também não vale
  savePendingInvite(store, "abc", 5000);
  assert.equal(readPendingInvite(store, 4000), null);
});

test("JSON corrompido ou sem código dá null e limpa", () => {
  const store = memory();
  for (const raw of ["{nao é json", "null", '"abc"', '{"code":"abc"}', '{"code":"","savedAt":1}', '{"code":1,"savedAt":1}']) {
    store.map.set("estante:convite", raw);
    assert.equal(readPendingInvite(store, 1), null, raw);
    assert.equal(store.map.size, 0, raw);
  }
});

test("armazenamento que lança não quebra nada", () => {
  assert.doesNotThrow(() => savePendingInvite(broken, "abc"));
  assert.equal(readPendingInvite(broken), null);
  assert.doesNotThrow(() => clearPendingInvite(broken));
  assert.equal(pendingInviteRedirect(broken, "/"), null);
});

test("inviteCodeFromPath só reconhece /amigos/convite/<code>", () => {
  assert.equal(inviteCodeFromPath("/amigos/convite/Ab-c_9"), "Ab-c_9");
  assert.equal(inviteCodeFromPath("/amigos/convite/Ab-c_9/"), "Ab-c_9");
  assert.equal(inviteCodeFromPath("/amigos"), null);
  assert.equal(inviteCodeFromPath("/amigos/x"), null);
  assert.equal(inviteCodeFromPath("/amigos/convite"), null);
  assert.equal(inviteCodeFromPath("/amigos/convite/"), null);
  assert.equal(inviteCodeFromPath("/amigos/convite/a/b"), null);
  assert.equal(inviteCodeFromPath("/"), null);
});

test("pendingInviteRedirect leva ao convite guardado, sem laço", () => {
  const store = memory();
  assert.equal(pendingInviteRedirect(store, "/"), null);
  savePendingInvite(store, "A");
  assert.equal(pendingInviteRedirect(store, "/"), "/amigos/convite/A");
  assert.equal(pendingInviteRedirect(store, "/perfil"), "/amigos/convite/A");
  // em qualquer rota de convite não redireciona
  assert.equal(pendingInviteRedirect(store, "/amigos/convite/A"), null);
  assert.equal(pendingInviteRedirect(store, "/amigos/convite/B"), null);
  // a tela do convite limpa ao montar: "Agora não" vai para / e fica lá
  clearPendingInvite(store);
  assert.equal(pendingInviteRedirect(store, "/"), null);
  // vencido também não redireciona
  savePendingInvite(store, "A", 0);
  assert.equal(pendingInviteRedirect(store, "/", PENDING_INVITE_TTL_MS + 1), null);
});

test("textos do badge de amigos", () => {
  assert.equal(friendsReadText([]), "");
  assert.equal(friendsReadText(["Ana"]), "Ana já leu");
  assert.equal(friendsReadText(["Ana", "João"]), "Ana e João já leram");
  assert.equal(friendsReadText(["Ana", "João", "Caio"]), "Ana, João e mais 1 já leram");
  assert.equal(friendsReadText(["Ana", "João", "Caio", "Davi"]), "Ana, João e mais 2 já leram");
  assert.equal(friendsReadChip(1), "1 amigo leu");
  assert.equal(friendsReadChip(2), "2 amigos leram");
  assert.equal(displayName({ name: null }), "Leitor(a)");
  assert.equal(displayName({ name: "  " }), "Leitor(a)");
  assert.equal(displayName({ name: "Ana" }), "Ana");
});
