import { test } from "node:test";
import assert from "node:assert/strict";
import { invite, login, openDatabase } from "./friends-helpers.ts";

const { env } = await import("../server/env.ts");

test("convite inexistente dá 404 INVITE_INVALID nas duas rotas", async () => {
  const bia = await login(openDatabase(":memory:"), "Bia");
  const expected = { status: 404, json: { error: "Convite inválido ou já usado", code: "INVITE_INVALID" } };
  assert.deepEqual(await bia.call("GET", "/api/friends/invites/nao-existe"), expected);
  assert.deepEqual(await bia.call("POST", "/api/friends/invites/nao-existe/accept"), expected);
});

test("o próprio convite continua dando 400 INVITE_SELF", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const code = await invite(ana);
  assert.deepEqual(await ana.call("GET", `/api/friends/invites/${code}`), { status: 400, json: { error: "Este convite é seu", code: "INVITE_SELF" } });
});

test("amigo inexistente e item inexistente dão 404 NOT_FOUND", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  const expected = { status: 404, json: { error: "Não encontrado", code: "NOT_FOUND" } };
  assert.deepEqual(await ana.call("GET", "/api/friends/nao-existe/shelf"), expected);
  assert.deepEqual(await ana.call("DELETE", "/api/friends/nao-existe"), expected);
  assert.deepEqual(await ana.call("GET", "/api/shelf/nao-existe/friends"), expected);
});

test("recompensa de anúncio inválida dá 400 com o código do motivo", async () => {
  const prev = env.ads.enabled;
  env.ads.enabled = true;
  try {
    const ana = await login(openDatabase(":memory:"), "Ana");
    assert.deepEqual(await ana.call("POST", "/api/ads/reward", { provider: "outro", outcome: "viewed" }), {
      status: 400,
      json: { error: "Provedor de anúncio inválido", code: "AD_PROVIDER_INVALID" },
    });
    assert.deepEqual(await ana.call("POST", "/api/ads/reward", { provider: env.ads.provider, outcome: "dismissed" }), {
      status: 400,
      json: { error: "Anúncio não concluído", code: "AD_NOT_COMPLETED" },
    });
    assert.deepEqual(await ana.call("POST", "/api/shelf", { book: { source: "manual", title: "Livro" } }), {
      status: 403,
      json: { error: "Assista um anúncio para adicionar livros nesta sessão", code: "AD_REQUIRED" },
    });
  } finally {
    env.ads.enabled = prev;
  }
});
