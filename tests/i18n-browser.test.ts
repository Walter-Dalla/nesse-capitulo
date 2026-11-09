import { test } from "node:test";
import assert from "node:assert/strict";
import { HTML_LANG, localeCookie, resolveInitialLocale } from "../client/src/lib/i18n.ts";

test("cookie vence data-locale e languages", () => {
  assert.equal(resolveInitialLocale({ cookie: "lang=es", dataLocale: "pt", languages: ["en"] }), "es");
  assert.equal(resolveInitialLocale({ cookie: "sid=abc; lang=pt; x=1", dataLocale: "en", languages: ["es"] }), "pt");
});

test("cookie aceita maiúscula e região", () => {
  assert.equal(resolveInitialLocale({ cookie: "lang=PT", languages: [] }), "pt");
  assert.equal(resolveInitialLocale({ cookie: "lang=pt-BR", languages: [] }), "pt");
});

test("cookie inválido ou de outro nome é ignorado", () => {
  assert.equal(resolveInitialLocale({ cookie: "lang=xx", dataLocale: "es", languages: ["en"] }), "es");
  assert.equal(resolveInitialLocale({ cookie: "lang=", dataLocale: "es", languages: [] }), "es");
  assert.equal(resolveInitialLocale({ cookie: "slang=pt", languages: [] }), "en");
  assert.equal(resolveInitialLocale({ cookie: "", dataLocale: "pt", languages: [] }), "pt");
});

test("data-locale vence languages; inválido ou ausente cai em languages", () => {
  assert.equal(resolveInitialLocale({ cookie: "", dataLocale: "es", languages: ["pt"] }), "es");
  assert.equal(resolveInitialLocale({ cookie: "", dataLocale: "xx", languages: ["pt"] }), "pt");
  assert.equal(resolveInitialLocale({ cookie: "", dataLocale: undefined, languages: ["pt"] }), "pt");
});

test("languages por língua-base, na ordem, pulando o que não existe", () => {
  assert.equal(resolveInitialLocale({ cookie: "", languages: ["pt-BR", "en"] }), "pt");
  assert.equal(resolveInitialLocale({ cookie: "", languages: ["fr-FR", "es-419", "en"] }), "es");
  assert.equal(resolveInitialLocale({ cookie: "", languages: ["PT"] }), "pt");
});

test("sem nada, en", () => {
  assert.equal(resolveInitialLocale({ cookie: "", languages: [] }), "en");
  assert.equal(resolveInitialLocale({ cookie: "", languages: ["fr", "de"] }), "en");
  assert.equal(resolveInitialLocale({}), "en");
});

test("cookie gravado", () => {
  assert.equal(localeCookie("pt", false), "lang=pt; Path=/; Max-Age=31536000; SameSite=Lax");
  assert.equal(localeCookie("en", false), "lang=en; Path=/; Max-Age=31536000; SameSite=Lax");
  assert.equal(localeCookie("es", true), "lang=es; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
});

test("lang do html igual ao que o servidor entrega", () => {
  assert.deepEqual(HTML_LANG, { pt: "pt-BR", en: "en", es: "es" });
});
