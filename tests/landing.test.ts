import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANDING_TEXT, renderLanding } from "../server/landingText.ts";
import type { Locale } from "../server/locale.ts";

const template = readFileSync("client/landing.html", "utf8");
const EXPECTED: Record<Locale, { lang: string; canonical: string; h1?: string }> = {
  pt: { lang: "pt-BR", canonical: "%SITE_URL%/?lang=pt", h1: "Sua estante de leituras, no bolso" },
  en: { lang: "en", canonical: "%SITE_URL%/" },
  es: { lang: "es", canonical: "%SITE_URL%/?lang=es" },
};
const LOCALES = Object.keys(EXPECTED) as Locale[];

function jsonLd(html: string): unknown[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

for (const locale of LOCALES) {
  const html = renderLanding(template, locale);
  const expected = EXPECTED[locale];

  test(`landing ${locale}: sem {{ e com JSON-LD válido`, () => {
    assert.equal(html.includes("{{"), false);
    const blocks = jsonLd(html);
    assert.equal(blocks.length, 1);
    const graph = (blocks[0] as { "@graph": { inLanguage?: string; mainEntity?: { name: string }[] }[] })["@graph"];
    assert.equal(graph[0].inLanguage, expected.lang);
    assert.equal(graph[1].mainEntity?.[0].name, LANDING_TEXT[locale].faq1Question);
  });

  test(`landing ${locale}: lang, canonical e hreflang exatos`, () => {
    assert.ok(html.includes(`<html lang="${expected.lang}">`));
    assert.ok(html.includes(`<link rel="canonical" href="${expected.canonical}" />`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="pt" href="%SITE_URL%/?lang=pt" />`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="es" href="%SITE_URL%/?lang=es" />`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="%SITE_URL%/" />`));
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="%SITE_URL%/" />`));
  });

  test(`landing ${locale}: seletor marca só o idioma atual`, () => {
    for (const option of LOCALES) {
      const current = option === locale;
      const link = `<a class="${current ? "on" : "off"}" href="/?lang=${option}" aria-current="${current}">${option.toUpperCase()}</a>`;
      assert.ok(html.includes(link), link);
    }
  });
}

test("os 3 dicionários têm as mesmas chaves", () => {
  const keys = Object.keys(LANDING_TEXT.pt).sort();
  assert.ok(keys.length > 0);
  assert.deepEqual(Object.keys(LANDING_TEXT.en).sort(), keys);
  assert.deepEqual(Object.keys(LANDING_TEXT.es).sort(), keys);
});

test("texto da home não tem aspas duplas nem HTML, porque entra sem escape", () => {
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(LANDING_TEXT[locale])) assert.doesNotMatch(value, /["<>&]/, `${locale}.${key}`);
  }
});

test("h1 em PT continua o de hoje", () => {
  assert.ok(renderLanding(template, "pt").includes(`<h1>${EXPECTED.pt.h1}</h1>`));
});

test("renderLanding lança em chave ausente", () => {
  assert.throws(() => renderLanding("<p>{{naoExiste}}</p>", "pt"), /naoExiste/);
});
