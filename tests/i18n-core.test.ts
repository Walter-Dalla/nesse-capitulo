import { test } from "node:test";
import assert from "node:assert/strict";
import { MESSAGES } from "../client/src/lib/messages/index.ts";
import { getLocale, intlTag, setLocale, subscribe, t, tp, urlWithoutLang, type Locale } from "../client/src/lib/i18n.ts";

const LOCALES: Locale[] = ["pt", "en", "es"];
const paramsOf = (message: string) => [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("dicionários: mesmas chaves nos 3 idiomas", () => {
  const keys = Object.keys(MESSAGES.pt).sort();
  assert.ok(keys.length > 0);
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), keys);
  assert.deepEqual(Object.keys(MESSAGES.es).sort(), keys);
});

test("dicionários: mesmos {params} por chave, nenhum valor vazio", () => {
  for (const [key, message] of Object.entries(MESSAGES.pt)) {
    for (const locale of LOCALES) {
      const value = (MESSAGES[locale] as Record<string, string>)[key];
      assert.ok(value.trim().length > 0, `${locale} ${key} vazio`);
      assert.deepEqual(paramsOf(value), paramsOf(message), `${locale} ${key}`);
    }
  }
});

test("chave com prefixo da área", () => {
  for (const key of Object.keys(MESSAGES.pt)) assert.match(key, /^(base|library|social)\./);
});

test("marca igual nos 3 idiomas", () => {
  for (const locale of LOCALES) {
    setLocale(locale);
    assert.equal(t("base.appName"), "Estante");
  }
});

test("t troca o param e não reinterpreta o valor", () => {
  setLocale("pt");
  assert.equal(t("base.cancel"), "Cancelar");
  assert.equal(t("base.friends.readOne", { name: "Ana" }), "Ana já leu");
  assert.equal(t("base.friends.readOne", { name: "{name}" }), "{name} já leu");
  assert.equal(t("base.friends.readOne", { name: "$& <b>" }), "$& <b> já leu");
  assert.equal(t("base.friends.readOne", {}), "{name} já leu");
  setLocale("en");
  assert.equal(t("base.cancel"), "Cancel");
  assert.equal(t("base.friends.readOne", { name: "Ana" }), "Ana has read it");
  setLocale("es");
  assert.equal(t("base.save"), "Guardar");
  assert.equal(t("base.friends.readOne", { name: "Ana" }), "Ana ya lo leyó");
});

test("tp usa _one só em 1; 0 usa _other", () => {
  setLocale("pt");
  assert.equal(tp("base.friends.readChip", 0), "0 amigos leram");
  assert.equal(tp("base.friends.readChip", 1), "1 amigo leu");
  assert.equal(tp("base.friends.readChip", 2), "2 amigos leram");
  setLocale("en");
  assert.equal(tp("base.friends.readChip", 0), "0 friends read it");
  assert.equal(tp("base.friends.readChip", 1), "1 friend read it");
  assert.equal(tp("base.friends.readChip", 2), "2 friends read it");
  setLocale("es");
  assert.equal(tp("base.friends.readChip", 0), "0 amigos lo leyeron");
  assert.equal(tp("base.friends.readChip", 1), "1 amigo lo leyó");
  assert.equal(tp("base.friends.readChip", 2), "2 amigos lo leyeron");
});

test("setLocale notifica subscribe só na troca, e o cancelamento vale", () => {
  setLocale("en");
  let calls = 0;
  const unsubscribe = subscribe(() => calls++);
  setLocale("es");
  assert.equal(calls, 1);
  assert.equal(getLocale(), "es");
  setLocale("es");
  assert.equal(calls, 1);
  unsubscribe();
  setLocale("pt");
  assert.equal(calls, 1);
});

test("intlTag por idioma", () => {
  setLocale("pt");
  assert.equal(intlTag(), "pt-BR");
  setLocale("en");
  assert.equal(intlTag(), "en-US");
  setLocale("es");
  assert.equal(intlTag(), "es-ES");
});

test("urlWithoutLang tira só o lang", () => {
  assert.equal(urlWithoutLang("https://x.dev/?lang=pt"), "/");
  assert.equal(urlWithoutLang("https://x.dev/amigos?lang=es&a=1#b"), "/amigos?a=1#b");
  assert.equal(urlWithoutLang("https://x.dev/amigos?a=1"), "/amigos?a=1");
});
