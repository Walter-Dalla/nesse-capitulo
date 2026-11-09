import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ORIGIN = "https://estante.example";
type FetchEvent = { request: { method: string; url: string; mode: string; destination: string }; respondWith(p: Promise<unknown>): void };

/** Carrega `client/public/sw.js` com `self`, `caches` e `fetch` falsos e devolve o handler de `fetch` e os `put` gravados. */
function loadServiceWorker() {
  const listeners: Record<string, (event: FetchEvent) => void> = {};
  const puts: string[] = [];
  const cache = { put: async (key: string) => void puts.push(key) };
  const context = {
    URL,
    self: { location: { origin: ORIGIN }, addEventListener: (type: string, fn: (event: FetchEvent) => void) => (listeners[type] = fn) },
    caches: { open: async () => cache, match: async () => undefined },
    fetch: async () => ({ ok: true, clone: () => ({}) }),
  };
  vm.runInNewContext(readFileSync("client/public/sw.js", "utf8"), context);
  return { onFetch: listeners.fetch, puts };
}

async function navigate(pathname: string) {
  const { onFetch, puts } = loadServiceWorker();
  let response: Promise<unknown> | undefined;
  onFetch({
    request: { method: "GET", url: `${ORIGIN}${pathname}`, mode: "navigate", destination: "document" },
    respondWith: (p) => (response = p),
  });
  assert.ok(response, "a navegação passa pelo service worker");
  await response;
  await new Promise((resolve) => setImmediate(resolve));
  return puts;
}

for (const pathname of ["/privacidade", "/termos", "/excluir-conta"]) {
  test(`navegar para ${pathname} não grava o fallback offline`, async () => {
    assert.deepEqual(await navigate(pathname), []);
  });
}

test("navegar para / grava o fallback offline", async () => {
  assert.deepEqual(await navigate("/"), ["/"]);
});

test("navegar para rota do app também grava o fallback", async () => {
  assert.deepEqual(await navigate("/amigos"), ["/"]);
});
