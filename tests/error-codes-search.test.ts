import { test } from "node:test";
import assert from "node:assert/strict";
import { login, openDatabase } from "./friends-helpers.ts";

const GOOGLE = "googleapis.com";

/** Troca `fetch` por respostas fixas por fonte e restaura ao fim; nada vai à rede. */
async function withSources(googleStatus: number, openLibraryStatus: number, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    return new Response("{}", { status: url.includes(GOOGLE) ? googleStatus : openLibraryStatus });
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("429 do Google e falha da Open Library dá 503 SEARCH_SOURCES_LIMITED", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  await withSources(429, 500, async () => {
    assert.deepEqual(await ana.call("GET", "/api/search?q=consulta-limite"), {
      status: 503,
      json: {
        error: "Busca temporariamente indisponível (limite das fontes externas). Tente de novo em instantes ou cadastre o livro manualmente.",
        code: "SEARCH_SOURCES_LIMITED",
      },
    });
  });
});

test("outra falha das duas fontes dá 503 SEARCH_UNAVAILABLE", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  await withSources(500, 500, async () => {
    assert.deepEqual(await ana.call("GET", "/api/search?q=consulta-falha"), {
      status: 503,
      json: { error: "Não foi possível consultar as fontes de livros agora.", code: "SEARCH_UNAVAILABLE" },
    });
  });
});

test("a 6ª consulta seguida do mesmo usuário dá 429 SEARCH_RATE_LIMITED", async () => {
  const ana = await login(openDatabase(":memory:"), "Ana");
  await withSources(500, 500, async () => {
    for (let i = 1; i <= 5; i++) {
      assert.equal((await ana.call("GET", `/api/search?q=rajada-${i}`)).status, 503);
    }
    assert.deepEqual(await ana.call("GET", "/api/search?q=rajada-6"), {
      status: 429,
      json: { error: "Muitas buscas em sequência. Aguarde um instante.", code: "SEARCH_RATE_LIMITED" },
    });
  });
});
