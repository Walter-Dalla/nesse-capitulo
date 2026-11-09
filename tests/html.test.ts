import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

process.env.ALLOW_DEV_LOGIN = "true";
process.env.NODE_ENV = "test";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");
const { mountClient } = await import("../server/html.ts");

const db = openDatabase(":memory:");
const app = createApp(db);
mountClient(app, db, path.resolve("client"));

async function get(pathname: string, headers: Record<string, string> = {}) {
  const res = await app.request(pathname, { headers });
  return { res, body: await res.text() };
}

const lang = (body: string) => /<html [^>]*>/.exec(body)?.[0];

test("anônimo em / com pt-BR recebe a home em PT", async () => {
  const { res, body } = await get("/", { "accept-language": "pt-BR" });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  assert.equal(lang(body), '<html lang="pt-BR">');
  assert.ok(body.includes("<h1>Sua estante de leituras, no bolso</h1>"));
});

test("anônimo em / sem cabeçalho recebe a home em EN", async () => {
  const { body } = await get("/");
  assert.equal(lang(body), '<html lang="en">');
  assert.equal(body.includes("{{"), false);
});

test("de + cf-ipcountry BR cai em PT", async () => {
  const { body } = await get("/", { "accept-language": "de", "cf-ipcountry": "BR" });
  assert.equal(lang(body), '<html lang="pt-BR">');
});

test("/?lang=es responde em ES e grava o cookie lang", async () => {
  const { res, body } = await get("/?lang=es");
  assert.equal(lang(body), '<html lang="es">');
  const cookie = res.headers.get("set-cookie") ?? "";
  assert.match(cookie, /^lang=es;/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /HttpOnly/i);
});

test("/?lang=xx não grava o cookie lang", async () => {
  const { res, body } = await get("/?lang=xx", { "accept-language": "es" });
  assert.equal(lang(body), '<html lang="es">');
  assert.equal(res.headers.get("set-cookie"), null);
});

test("detecção nunca grava o cookie", async () => {
  const { res } = await get("/", { "accept-language": "pt-BR" });
  assert.equal(res.headers.get("set-cookie"), null);
});

test("cookie lang=es vence pt-BR", async () => {
  const { body } = await get("/", { cookie: "lang=es", "accept-language": "pt-BR" });
  assert.equal(lang(body), '<html lang="es">');
});

test("HTML sai com Vary exato e no-cache", async () => {
  for (const pathname of ["/", "/login"]) {
    const { res } = await get(pathname);
    assert.equal(res.headers.get("vary"), "Accept-Language, CF-IPCountry, Cookie", pathname);
    assert.equal(res.headers.get("cache-control"), "no-cache", pathname);
  }
});

test("/login é a SPA com data-locale", async () => {
  const { body } = await get("/login", { "accept-language": "pt-BR" });
  assert.equal(lang(body), '<html lang="pt-BR" data-locale="pt">');
  assert.ok(body.includes('<div id="root"></div>'));
});

test("?lang= em rota da SPA também grava", async () => {
  const { res, body } = await get("/login?lang=es");
  assert.equal(lang(body), '<html lang="es" data-locale="es">');
  assert.match(res.headers.get("set-cookie") ?? "", /^lang=es;/);
});

test("logado em / recebe a SPA com data-locale", async () => {
  const login = await app.request("/auth/dev", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Host: "localhost:3000" },
    body: "{}",
  });
  assert.equal(login.status, 200);
  const sid = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const { body } = await get("/", { cookie: sid, "accept-language": "es" });
  assert.equal(lang(body), '<html lang="es" data-locale="es">');
  assert.ok(body.includes('<div id="root"></div>'));
});

test("/landing.html redireciona 301 para /", async () => {
  const { res } = await get("/landing.html");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/");
});

test("/api/health e 404 da API seguem intactos", async () => {
  const health = await get("/api/health");
  assert.equal(health.res.status, 200);
  assert.deepEqual(JSON.parse(health.body), { ok: true });
  assert.equal(health.res.headers.get("vary"), null);
  const missing = await get("/api/nao-existe");
  assert.equal(missing.res.status, 401);
  const authMissing = await get("/auth/nao-existe");
  assert.equal(authMissing.res.status, 404);
  assert.equal(lang(authMissing.body), undefined);
});
