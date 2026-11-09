import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_LOCALE, negotiateLocale, normalizeLocale, parseAcceptLanguage } from "../server/locale.ts";

const CASES: { name: string; input: Parameters<typeof negotiateLocale>[0]; locale: string; fromQuery?: boolean }[] = [
  { name: "pt-BR,pt;q=0.9", input: { acceptLanguage: "pt-BR,pt;q=0.9" }, locale: "pt" },
  { name: "de,en;q=0.8,pt;q=0.5", input: { acceptLanguage: "de,en;q=0.8,pt;q=0.5" }, locale: "en" },
  { name: "q manda, não a posição", input: { acceptLanguage: "pt;q=0.5,es;q=0.9" }, locale: "es" },
  { name: "fr + BR", input: { acceptLanguage: "fr", country: "BR" }, locale: "pt" },
  { name: "de + DE", input: { acceptLanguage: "de", country: "DE" }, locale: "en" },
  { name: "es-419", input: { acceptLanguage: "es-419" }, locale: "es" },
  { name: "EN-gb", input: { acceptLanguage: "EN-gb" }, locale: "en" },
  { name: "pt;q=0,es", input: { acceptLanguage: "pt;q=0,es" }, locale: "es" },
  { name: "* + MX", input: { acceptLanguage: "*", country: "MX" }, locale: "es" },
  { name: "navegador vence o país", input: { acceptLanguage: "en", country: "BR" }, locale: "en" },
  { name: "país em minúsculas", input: { country: "br" }, locale: "pt" },
  { name: "vazio sem país", input: {}, locale: "en" },
  { name: "cabeçalho vazio", input: { acceptLanguage: "" }, locale: "en" },
  { name: "país XX", input: { country: "XX" }, locale: "en" },
  { name: "país T1", input: { country: "T1" }, locale: "en" },
  { name: "cookie xx + es", input: { cookie: "xx", acceptLanguage: "es" }, locale: "es" },
  { name: "cookie pt + es", input: { cookie: "pt", acceptLanguage: "es" }, locale: "pt" },
  { name: "query ES + cookie pt", input: { query: "ES", cookie: "pt" }, locale: "es", fromQuery: true },
  { name: "query xx + cookie pt", input: { query: "xx", cookie: "pt" }, locale: "pt" },
  { name: "q inválido vale 1", input: { acceptLanguage: "pt;q=0.9,es;q=abc" }, locale: "es" },
  { name: "q acima de 1 vale 1", input: { acceptLanguage: "pt;q=0.9,es;q=7" }, locale: "es" },
  { name: "malformado", input: { acceptLanguage: ";;,,;q=,=;pt;q" }, locale: "en" },
];

for (const { name, input, locale, fromQuery = false } of CASES) {
  test(`negotiateLocale: ${name}`, () => {
    assert.deepEqual(negotiateLocale(input), { locale, fromQuery });
  });
}

test("normalizeLocale aceita os 3 idiomas e recusa o resto", () => {
  assert.equal(normalizeLocale("PT"), "pt");
  assert.equal(normalizeLocale("pt-BR"), "pt");
  assert.equal(normalizeLocale("xx"), null);
  assert.equal(normalizeLocale(""), null);
  assert.equal(normalizeLocale(undefined), null);
});

test("Accept-Language de 10 KB não lança e corta em 1 KB e 32 itens", () => {
  const huge = "de,".repeat(3500);
  assert.equal(huge.length > 10_000, true);
  assert.deepEqual(negotiateLocale({ acceptLanguage: huge }), { locale: "en", fromQuery: false });
  // pt só depois de 1 KB
  assert.deepEqual(parseAcceptLanguage(`${"x".repeat(1024)},pt`), []);
  // pt no item 33, dentro de 1 KB
  assert.deepEqual(parseAcceptLanguage(`${"de,".repeat(32)}pt`), []);
  assert.deepEqual(parseAcceptLanguage(`${"de,".repeat(31)}pt`), ["pt"]);
});

test("COUNTRY_LOCALE cobre a tabela de países", () => {
  for (const code of "BR PT AO MZ CV GW ST TL".split(" ")) assert.equal(COUNTRY_LOCALE[code], "pt", code);
  for (const code of "ES MX AR CO CL PE VE EC GT CU BO DO HN PY SV NI CR PA UY PR GQ".split(" ")) assert.equal(COUNTRY_LOCALE[code], "es", code);
  assert.equal(Object.keys(COUNTRY_LOCALE).length, 29);
  assert.equal(COUNTRY_LOCALE.XX, undefined);
  assert.equal(COUNTRY_LOCALE.T1, undefined);
});
