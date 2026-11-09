import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.NODE_ENV = "test";
process.env.BASE_URL = "https://estante.example";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");
const { LEGAL_TEXT } = await import("../server/legalText.ts");
const { APP_NAME, CONTACT_EMAIL, DEVELOPER_NAME } = await import("../server/contact.ts");

const app = createApp(openDatabase(":memory:"));
const PATHS = ["/privacidade", "/termos", "/excluir-conta"];
const HTML_LANGS = { pt: "pt-BR", en: "en", es: "es" } as const;
const LOCALES = Object.keys(HTML_LANGS) as (keyof typeof HTML_LANGS)[];

async function get(pathname: string) {
  const res = await app.request(pathname);
  return { res, body: await res.text() };
}

for (const pathname of PATHS) {
  for (const locale of LOCALES) {
    test(`${pathname} em ${locale}: pública, HTML completo e sem marcador sobrando`, async () => {
      const { res, body } = await get(`${pathname}?lang=${locale}`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/html/);
      assert.ok(body.includes(`<html lang="${HTML_LANGS[locale]}">`));
      assert.equal(body.includes("{{"), false);
      assert.doesNotMatch(body, /\{(email|login|deleteLink)\}/);
      assert.ok(body.includes(CONTACT_EMAIL));
      assert.equal(body.includes("<script"), false);
      assert.ok(body.includes('href="/"'), "voltar para a home");
    });

    test(`${pathname} em ${locale}: canonical, hreflang, seletor e links entre as páginas`, async () => {
      const { body } = await get(`${pathname}?lang=${locale}`);
      const canonical = { pt: "?lang=pt", en: "", es: "?lang=es" }[locale];
      assert.ok(body.includes(`<link rel="canonical" href="https://estante.example${pathname}${canonical}" />`));
      assert.ok(body.includes(`hreflang="pt" href="https://estante.example${pathname}?lang=pt"`));
      assert.ok(body.includes(`hreflang="en" href="https://estante.example${pathname}"`));
      assert.ok(body.includes(`hreflang="es" href="https://estante.example${pathname}?lang=es"`));
      assert.ok(body.includes(`hreflang="x-default" href="https://estante.example${pathname}"`));
      for (const option of LOCALES) {
        const current = option === locale;
        assert.ok(body.includes(`<a class="${current ? "on" : "off"}" href="${pathname}?lang=${option}" aria-current="${current}">${option.toUpperCase()}</a>`), option);
      }
      for (const other of PATHS) assert.ok(body.includes(`href="${other}"`), other);
    });
  }
}

for (const locale of LOCALES) {
  test(`/excluir-conta em ${locale} cita app, desenvolvedor, caminho e prazo`, async () => {
    const { body } = await get(`/excluir-conta?lang=${locale}`);
    assert.equal(APP_NAME, "Estante");
    assert.equal(DEVELOPER_NAME, "Walter Dalla");
    assert.ok(body.includes("Estante"));
    assert.ok(body.includes("Walter Dalla"));
    assert.ok(body.includes('href="/login"'));
    assert.ok(body.includes(LEGAL_TEXT[locale].backupRetention));
    assert.ok(body.includes(LEGAL_TEXT[locale].deleteEmailBody.split("{email}")[1]), "alternativa por e-mail");
    assert.match(LEGAL_TEXT[locale].deleteEmailBody, /30/);
  });

  test(`/privacidade em ${locale} tem a âncora de exclusão apontando para /excluir-conta`, async () => {
    const { body } = await get(`/privacidade?lang=${locale}`);
    const section = /<section id="exclusao">[\s\S]*?<\/section>/.exec(body)?.[0] ?? "";
    assert.ok(section.includes('href="/excluir-conta"'));
    assert.ok(body.includes(LEGAL_TEXT[locale].backupRetention));
  });

  test(`/termos em ${locale} exige 13 anos`, async () => {
    const { body } = await get(`/termos?lang=${locale}`);
    assert.match(body, /13 (anos|or older|años)/);
  });

  test(`backupRetention em ${locale} diz 30 dias`, () => {
    assert.match(LEGAL_TEXT[locale].backupRetention, /30/);
  });
}

test("os 3 idiomas têm as mesmas chaves", () => {
  const keys = Object.keys(LEGAL_TEXT.pt).sort();
  assert.ok(keys.length > 0);
  assert.deepEqual(Object.keys(LEGAL_TEXT.en).sort(), keys);
  assert.deepEqual(Object.keys(LEGAL_TEXT.es).sort(), keys);
});

test("só backupRetention fala de backup", () => {
  for (const locale of LOCALES) {
    for (const [key, value] of Object.entries(LEGAL_TEXT[locale])) {
      if (key !== "backupRetention") assert.doesNotMatch(value, /backup|copias de seguridad/i, `${locale}.${key}`);
    }
  }
});

test("idioma das páginas segue a negociação sem gravar cookie", async () => {
  const res = await app.request("/termos", { headers: { "accept-language": "pt-BR" } });
  assert.ok((await res.text()).includes('<html lang="pt-BR">'));
  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(res.headers.get("vary"), "Accept-Language, CF-IPCountry, Cookie");
  assert.equal(res.headers.get("cache-control"), "no-cache");
});

test("?lang=es grava o cookie lang como a home", async () => {
  const { res, body } = await get("/privacidade?lang=es");
  assert.ok(body.includes('<html lang="es">'));
  const cookie = res.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^lang=es;/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /HttpOnly/i);
});

test("conferência das afirmações: o que o amigo vê e a validade da sessão", () => {
  const friends = readFileSync("server/routes/friends.ts", "utf8");
  const cols = /const FRIEND_BOOK_COLS = `([\s\S]*?)`/.exec(friends)?.[1];
  assert.ok(cols, "FRIEND_BOOK_COLS não encontrado");
  for (const column of ["rating", "review", "started_at", "finished_at", "description", "email"]) {
    assert.equal(cols.includes(column), false, column);
  }

  const types = readFileSync("server/types.ts", "utf8");
  const friendUser = /export interface FriendUser \{([\s\S]*?)\n\}/.exec(types)?.[1];
  assert.ok(friendUser, "FriendUser não encontrado");
  assert.doesNotMatch(friendUser, /email/);

  const auth = readFileSync("server/auth.ts", "utf8");
  const ttl = /const SESSION_TTL_MS = ([\d\s*]+);/.exec(auth)?.[1];
  assert.ok(ttl, "SESSION_TTL_MS não encontrado");
  const ms = ttl.split("*").reduce((total, factor) => total * Number(factor), 1);
  assert.equal(ms, 30 * 24 * 60 * 60 * 1000);

  // oauth_state: 10 minutos
  const stateCookie = /setCookie\(c, STATE_COOKIE, state, \{[\s\S]*?\}\);/.exec(auth)?.[0];
  assert.ok(stateCookie, "cookie oauth_state não encontrado");
  assert.match(auth, /const STATE_COOKIE = "oauth_state";/);
  assert.match(stateCookie, /maxAge: 600\b/);

  // convite guardado no aparelho: 1 hora
  const invite = readFileSync("client/src/lib/pendingInvite.ts", "utf8");
  assert.match(invite, /export const PENDING_INVITE_TTL_MS = 60 \* 60 \* 1000;/);
});
