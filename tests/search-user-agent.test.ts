import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
const { searchBooks } = await import("../server/routes/search.ts");

const USER_AGENT = "Estante/0.1 (book tracker; contact: walterdallaprofissional@gmail.com)";
const realFetch = globalThis.fetch;

interface Captured {
  host: string;
  userAgent: string | undefined;
}

/** Nunca vai à rede: `respond` decide a resposta por host e cada chamada fica registrada. */
function fakeFetch(respond: (host: string) => Response) {
  const calls: Captured[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const host = new URL(String(input)).hostname;
    calls.push({ host, userAgent: (init?.headers as Record<string, string> | undefined)?.["User-Agent"] });
    return respond(host);
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("busca no Google manda o User-Agent com contato", async () => {
  const calls = fakeFetch(() => Response.json({ items: [] }));
  const { provider } = await searchBooks("termo exclusivo do user agent no google");
  assert.equal(provider, "google");
  assert.deepEqual(calls, [{ host: "www.googleapis.com", userAgent: USER_AGENT }]);
});

test("com o Google falhando, a Open Library recebe o mesmo User-Agent", async () => {
  const calls = fakeFetch((host) => (host === "openlibrary.org" ? Response.json({ docs: [] }) : new Response("erro", { status: 500 })));
  const { provider } = await searchBooks("termo exclusivo do user agent na open library");
  assert.equal(provider, "openlibrary");
  assert.deepEqual(calls, [
    { host: "www.googleapis.com", userAgent: USER_AGENT },
    { host: "openlibrary.org", userAgent: USER_AGENT },
  ]);
});
