import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ORIGIN = "https://estante.example";
const DAY = 24 * 60 * 60 * 1000;
const OL_BY_ID = "https://covers.openlibrary.org/b/id/123-M.jpg?default=false";
const OL_BY_ISBN = "https://covers.openlibrary.org/b/isbn/9780000000000-M.jpg?default=false";
const GOOGLE = "https://books.google.com/books/content?id=x&printsec=frontcover&img=1&zoom=1&source=gbs_api";

type SwEvent = {
  request?: { method: string; url: string; mode: string; destination: string };
  respondWith?(p: Promise<unknown>): void;
  waitUntil(p: Promise<unknown>): void;
};

/** Cache falso por nome, com `match`, `put`, `keys` e `delete` sobre um Map. */
class FakeCache {
  entries = new Map<string, Response>();
  async match(key: string) {
    return this.entries.get(key)?.clone();
  }
  async put(key: string, res: Response) {
    this.entries.set(key, res);
  }
  async keys() {
    return [...this.entries.keys()];
  }
  async delete(key: string) {
    return this.entries.delete(key);
  }
}

/** Carrega `client/public/sw.js` com `self`, `caches` (um cache por nome) e `fetch` falsos que contam chamadas. */
function loadServiceWorker() {
  const listeners: Record<string, (event: SwEvent) => void> = {};
  const stores = new Map<string, FakeCache>();
  const fetched: string[] = [];
  const open = (name: string) => {
    if (!stores.has(name)) stores.set(name, new FakeCache());
    return stores.get(name)!;
  };
  const context = {
    URL,
    Response,
    self: {
      location: { origin: ORIGIN },
      clients: { claim: async () => {} },
      addEventListener: (type: string, fn: (event: SwEvent) => void) => (listeners[type] = fn),
    },
    caches: {
      open: async (name: string) => open(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      match: async () => undefined,
    },
    fetch: async (url: string) => {
      fetched.push(url);
      return new Response("capa", { status: 200 });
    },
  };
  vm.runInNewContext(readFileSync("client/public/sw.js", "utf8"), context);
  return { listeners, open, stores, fetched };
}

/** Pede uma imagem de capa ao service worker e espera a resposta e o que ele agendou em `waitUntil`. */
async function requestCover(sw: ReturnType<typeof loadServiceWorker>, url: string) {
  let response: Promise<unknown> | undefined;
  const pending: Promise<unknown>[] = [];
  sw.listeners.fetch({
    request: { method: "GET", url, mode: "no-cors", destination: "image" },
    respondWith: (p) => (response = p),
    waitUntil: (p) => void pending.push(p),
  });
  assert.ok(response, "a capa passa pelo service worker");
  await response;
  await Promise.all(pending);
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** Põe a capa no cache, com carimbo de `ageMs` atrás, ou sem carimbo quando `ageMs` é nulo. */
async function seed(sw: ReturnType<typeof loadServiceWorker>, url: string, ageMs: number | null) {
  await sw.open("estante-covers").put(url, new Response("capa antiga"));
  if (ageMs !== null) await sw.open("estante-covers-meta").put(url, new Response(String(Date.now() - ageMs)));
}

test("capa por id da Open Library no cache, sem carimbo, não revalida", async () => {
  const sw = loadServiceWorker();
  await seed(sw, OL_BY_ID, null);
  await requestCover(sw, OL_BY_ID);
  assert.deepEqual(sw.fetched, []);
});

test("capa por ISBN gravada há 1 dia não revalida", async () => {
  const sw = loadServiceWorker();
  await seed(sw, OL_BY_ISBN, 1 * DAY);
  await requestCover(sw, OL_BY_ISBN);
  assert.deepEqual(sw.fetched, []);
});

test("capa por ISBN gravada há 31 dias revalida", async () => {
  const sw = loadServiceWorker();
  await seed(sw, OL_BY_ISBN, 31 * DAY);
  await requestCover(sw, OL_BY_ISBN);
  assert.deepEqual(sw.fetched, [OL_BY_ISBN]);
});

test("capa do Google no cache sem carimbo revalida", async () => {
  const sw = loadServiceWorker();
  await seed(sw, GOOGLE, null);
  await requestCover(sw, GOOGLE);
  assert.deepEqual(sw.fetched, [GOOGLE]);
});

test("capa fora do cache é buscada e gravada com carimbo", async () => {
  const sw = loadServiceWorker();
  const before = Date.now();
  await requestCover(sw, OL_BY_ISBN);
  assert.deepEqual(sw.fetched, [OL_BY_ISBN]);
  assert.deepEqual(await sw.open("estante-covers").keys(), [OL_BY_ISBN]);
  const stamp = await sw.open("estante-covers-meta").match(OL_BY_ISBN);
  assert.ok(stamp, "o carimbo foi gravado");
  assert.ok(Number(await stamp.text()) >= before);
});

test("sair da conta apaga sinopses, capas e carimbos das capas", async () => {
  const deleted: string[] = [];
  const fakeCaches = { delete: async (name: string) => (deleted.push(name), true) };
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.window = { caches: fakeCaches };
  globals.caches = fakeCaches;
  try {
    // Caminho em variável: o tsconfig de tests não tem tipos de DOM e não deve checar bookCache.ts por aqui.
    const bookCachePath = "../client/src/lib/bookCache.ts";
    const { clearBookCaches } = (await import(bookCachePath)) as { clearBookCaches: () => Promise<void> };
    await clearBookCaches();
  } finally {
    delete globals.window;
    delete globals.caches;
  }
  assert.deepEqual(deleted.sort(), ["estante-covers", "estante-covers-meta", "estante-details"]);
});

test("activate preserva o cache de carimbos das capas", async () => {
  const sw = loadServiceWorker();
  for (const name of ["estante-v1", "estante-covers", "estante-covers-meta", "estante-details", "estante-v0"]) sw.open(name);
  const pending: Promise<unknown>[] = [];
  sw.listeners.activate({ waitUntil: (p) => void pending.push(p) });
  await Promise.all(pending);
  assert.deepEqual([...sw.stores.keys()].sort(), ["estante-covers", "estante-covers-meta", "estante-details", "estante-v1"]);
});
