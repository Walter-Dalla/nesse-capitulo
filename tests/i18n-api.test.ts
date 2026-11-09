import { test } from "node:test";
import assert from "node:assert/strict";
import { ERROR_CODES as SERVER_CODES } from "../server/types.ts";
import { ERROR_CODES as CLIENT_CODES } from "../client/src/lib/types.ts";
import { MESSAGES } from "../client/src/lib/messages/index.ts";
import { apiErrorMessage, setLocale, type Locale } from "../client/src/lib/i18n.ts";

const LOCALES: Locale[] = ["pt", "en", "es"];
const dictionary = (locale: Locale) => MESSAGES[locale] as Record<string, string>;

test("cliente e servidor têm a mesma lista de códigos", () => {
  assert.deepEqual([...CLIENT_CODES], [...SERVER_CODES]);
});

test("cada código tem chave própria nos 3 idiomas, diferente do genérico salvo VALIDATION e INTERNAL", () => {
  for (const locale of LOCALES) {
    const messages = dictionary(locale);
    for (const code of SERVER_CODES) {
      const value = messages[`base.error.${code}`];
      assert.ok(value, `${locale} ${code}`);
      if (code !== "VALIDATION" && code !== "INTERNAL") assert.notEqual(value, messages["base.error.generic"], `${locale} ${code}`);
    }
  }
});

test("401 é sempre sessão, com ou sem código", () => {
  for (const locale of LOCALES) {
    setLocale(locale);
    const session = dictionary(locale)["base.error.session"];
    assert.equal(apiErrorMessage(undefined, 401), session);
    assert.equal(apiErrorMessage("NOT_FOUND", 401), session);
  }
});

test("sem código ou com código desconhecido é genérico", () => {
  for (const locale of LOCALES) {
    setLocale(locale);
    const generic = dictionary(locale)["base.error.generic"];
    for (const status of [403, 404, 500, 502]) assert.equal(apiErrorMessage(undefined, status), generic, `${locale} ${status}`);
    assert.equal(apiErrorMessage("XYZ", 400), generic);
    assert.equal(apiErrorMessage("constructor", 400), generic);
    assert.equal(apiErrorMessage("__proto__", 400), generic);
    assert.equal(apiErrorMessage(42 as unknown as string, 400), generic);
  }
});

test("código conhecido usa o próprio texto", () => {
  for (const locale of LOCALES) {
    setLocale(locale);
    assert.equal(apiErrorMessage("NOT_FOUND", 404), dictionary(locale)["base.error.NOT_FOUND"]);
    for (const code of SERVER_CODES) assert.equal(apiErrorMessage(code, 400), dictionary(locale)[`base.error.${code}`]);
  }
  setLocale("pt");
  assert.equal(apiErrorMessage("NOT_FOUND", 404), "Não encontrado");
  setLocale("en");
  assert.equal(apiErrorMessage("NOT_FOUND", 404), "Not found");
  setLocale("es");
  assert.equal(apiErrorMessage("NOT_FOUND", 404), "No se encontró");
});
