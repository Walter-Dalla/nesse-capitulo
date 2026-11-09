import { test } from "node:test";
import assert from "node:assert/strict";
import { allowSearch, normalizeOpenLibraryDoc, normalizeVolume, searchBooks } from "../server/routes/search.ts";

test("normaliza um volume do Google Books", () => {
  const b = normalizeVolume({
    id: "abc",
    volumeInfo: {
      title: "Sapiens",
      subtitle: "Uma breve história da humanidade",
      authors: ["Yuval Noah Harari"],
      publishedDate: "2015-01-01",
      pageCount: 464,
      industryIdentifiers: [{ type: "ISBN_10", identifier: "8525432180" }, { type: "ISBN_13", identifier: "9788525432186" }],
      imageLinks: { thumbnail: "http://books.google.com/books/content?id=abc&zoom=1&edge=curl&source=gbs_api" },
    },
  });
  assert.ok(b);
  assert.equal(b.sourceId, "abc");
  assert.equal(b.title, "Sapiens: Uma breve história da humanidade");
  assert.equal(b.publishedYear, 2015);
  assert.equal(b.pageCount, 464);
  assert.equal(b.isbn13, "9788525432186");
  assert.equal(b.coverRef, "g");
  assert.equal("coverUrl" in b, false, "URL da capa não é armazenada, é derivada do id");
});

test("ignora volumes sem título e trata campos ausentes", () => {
  assert.equal(normalizeVolume({ id: "x" }), null);
  const b = normalizeVolume({ id: "y", volumeInfo: { title: "Sem dados", pageCount: 0, publishedDate: "" } });
  assert.deepEqual(b, { source: "google", sourceId: "y", title: "Sem dados", authors: [], pageCount: null, publishedYear: null, isbn13: null, coverRef: null });
});

test("normaliza um documento da Open Library", () => {
  const b = normalizeOpenLibraryDoc({ key: "/works/OL123W", title: "Dom Casmurro", author_name: ["Machado de Assis"], first_publish_year: 1899, number_of_pages_median: 256, isbn: ["8535910662", "9788535910667"], cover_i: 8231856 });
  assert.deepEqual(b, { source: "openlibrary", sourceId: "OL123W", title: "Dom Casmurro", authors: ["Machado de Assis"], pageCount: 256, publishedYear: 1899, isbn13: "9788535910667", coverRef: "ol:8231856" });
  assert.equal(normalizeOpenLibraryDoc({ key: "/works/OL1W" }), null);
});

test("throttle por usuário: rajada de 5 e depois 1 por segundo", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(allowSearch("u1", t0), true);
  assert.equal(allowSearch("u1", t0), false);
  assert.equal(allowSearch("u2", t0), true, "outro usuário não é afetado");
  assert.equal(allowSearch("u1", t0 + 1000), true, "recarrega 1 token por segundo");
  assert.equal(allowSearch("u1", t0 + 1000), false);
});

test("Open Library sem resultados continua openlibrary quando volta do cache", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: string | URL | Request) => {
    calls++;
    return new URL(String(input)).hostname === "openlibrary.org" ? Response.json({ docs: [] }) : new Response("erro", { status: 500 });
  }) as typeof fetch;
  try {
    const first = await searchBooks("termo exclusivo vazio na open library");
    assert.deepEqual(first, { items: [], provider: "openlibrary" });
    const cached = await searchBooks("Termo exclusivo vazio na Open Library");
    assert.deepEqual(cached, { items: [], provider: "openlibrary" });
    assert.equal(calls, 2, "a segunda busca vem do cache, sem rede");
  } finally {
    globalThis.fetch = realFetch;
  }
});
