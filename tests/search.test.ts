import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeVolume } from "../server/routes/search.ts";

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
  assert.equal(b.coverUrl, "https://books.google.com/books/content?id=abc&zoom=1&source=gbs_api");
});

test("ignora volumes sem título e trata campos ausentes", () => {
  assert.equal(normalizeVolume({ id: "x" }), null);
  const b = normalizeVolume({ id: "y", volumeInfo: { title: "Sem dados", pageCount: 0, publishedDate: "" } });
  assert.deepEqual(b, { source: "google", sourceId: "y", title: "Sem dados", authors: [], coverUrl: null, pageCount: null, publishedYear: null, isbn13: null, description: null });
});
