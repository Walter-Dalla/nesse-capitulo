import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MESSAGES } from "../client/src/lib/messages/index.ts";
import { setLocale, t, tp } from "../client/src/lib/i18n.ts";
import { findLiterals } from "./i18n-literals.ts";

const FILES = [
  "client/src/pages/Shelf.tsx",
  "client/src/pages/Years.tsx",
  "client/src/components/BookCard.tsx",
  "client/src/pages/Search.tsx",
  "client/src/pages/AddManual.tsx",
  "client/src/components/AddSheet.tsx",
  "client/src/pages/BookDetail.tsx",
  "client/src/components/PageSheet.tsx",
  "client/src/components/DateField.tsx",
  "client/src/components/Stars.tsx",
  "client/src/components/ProgressBar.tsx",
];

for (const file of FILES) {
  test(`sem texto literal: ${file}`, () => {
    assert.deepEqual(findLiterals(readFileSync(file, "utf8")), []);
  });
}

test("telas de livros: dicionário library preenchido, PT igual ao texto antigo", () => {
  assert.ok(Object.keys(MESSAGES.pt).filter((key) => key.startsWith("library.")).length > 0);
  setLocale("pt");
  assert.equal(t("library.shelf.title"), "Estante");
  assert.equal(t("library.years.empty", { year: 2024 }), "Nenhuma leitura registrada em 2024");
  assert.equal(t("library.search.searchingFor", { q: "Duna" }), "Buscando “Duna”…");
  assert.equal(tp("library.years.heading", 1, { year: 2024 }), "1 leitura em 2024");
  assert.equal(tp("library.years.heading", 2, { year: 2024 }), "2 leituras em 2024");
  assert.equal(tp("library.stars.option", 1), "1 estrela");
});

test("telas de livros: EN e ES seguem o idioma, título da estante traduz", () => {
  setLocale("en");
  assert.equal(t("library.shelf.title"), "Shelf");
  assert.equal(tp("library.years.heading", 2, { year: 2024 }), "2 books read in 2024");
  setLocale("es");
  assert.equal(t("library.shelf.title"), "Estantería");
  assert.equal(tp("library.stars.option", 2), "2 estrellas");
});
