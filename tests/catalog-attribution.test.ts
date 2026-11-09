import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MESSAGES } from "../client/src/lib/messages/index.ts";
import { setLocale, t } from "../client/src/lib/i18n.ts";
import { searchAttribution } from "../client/src/lib/format.ts";

const search = readFileSync("client/src/pages/Search.tsx", "utf8");
const detail = readFileSync("client/src/pages/BookDetail.tsx", "utf8");
const LOCALES = ["pt", "en", "es"] as const;

test("atribuição: chaves nos 3 idiomas, Powered by Google igual em todos", () => {
  for (const locale of LOCALES) {
    const messages = MESSAGES[locale] as Record<string, string>;
    assert.ok(messages["library.search.viewAt"]?.includes("{source}"), `${locale}: viewAt com {source}`);
    assert.equal(messages["library.search.poweredByGoogle"], "Powered by Google", `${locale}: poweredByGoogle`);
  }
  setLocale("pt");
  assert.equal(t("library.search.viewAt", { source: "Google Books" }), "Ver no Google Books");
  setLocale("en");
  assert.equal(t("library.search.viewAt", { source: "Open Library" }), "View on Open Library");
  setLocale("es");
  assert.equal(t("library.search.viewAt", { source: "Google Books" }), "Ver en Google Books");
});

test("atribuição: busca e tela do livro linkam a página na fonte", () => {
  for (const src of [search, detail]) {
    assert.match(src, /bookSourceUrl\(/);
    assert.match(src, /t\("library\.search\.viewAt"/);
    assert.match(src, /target="_blank" rel="noopener"/);
  }
});

test("atribuição: link do resultado não abre a folha de adicionar", () => {
  assert.match(search, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
});

test("atribuição: rodapé da busca separa Open Library e Google", () => {
  assert.match(search, /searchAttribution\(/);
  assert.match(search, /attribution === "via" && \(\s*<p[^>]*>\{t\("library\.search\.via"/);
  assert.match(search, /attribution === "poweredByGoogle" && \(\s*<p[^>]*>\{t\("library\.search\.poweredByGoogle"\)/);
  assert.equal(search.match(/t\("library\.search\.poweredByGoogle"\)/g)?.length, 1, "Powered by Google só sai pelo searchAttribution");
});

test("atribuição: Open Library nunca leva texto do Google, nem vazia", () => {
  assert.equal(searchAttribution({ provider: "openlibrary", itemCount: 0, failed: false }), null);
  assert.equal(searchAttribution({ provider: "openlibrary", itemCount: 3, failed: false }), "via");
});

test("atribuição: Google, antes da busca e erro", () => {
  assert.equal(searchAttribution({ provider: "google", itemCount: 3, failed: false }), "poweredByGoogle");
  assert.equal(searchAttribution({ provider: "google", itemCount: 0, failed: false }), "poweredByGoogle");
  assert.equal(searchAttribution({ provider: null, itemCount: 0, failed: false }), "poweredByGoogle", "antes da primeira busca");
  assert.equal(searchAttribution({ provider: undefined, itemCount: 0, failed: true }), null, "busca com erro");
});
