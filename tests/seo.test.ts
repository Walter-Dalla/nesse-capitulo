import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.BASE_URL = "https://estante.example";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");

const app = createApp(openDatabase(":memory:"));

test("robots.txt libera só páginas públicas e aponta o sitemap com BASE_URL", async () => {
  const res = await app.request("/robots.txt");
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /^User-agent: \*/);
  for (const p of ["/api/", "/auth/", "/livro/", "/amigos", "/perfil"]) assert.ok(body.includes(`Disallow: ${p}`), p);
  assert.ok(body.includes("Allow: /login"));
  assert.ok(body.endsWith("Sitemap: https://estante.example/sitemap.xml\n"));
});

test("sitemap.xml lista as páginas públicas com URL absoluta", async () => {
  const res = await app.request("/sitemap.xml");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/xml/);
  const body = await res.text();
  assert.ok(body.includes("<loc>https://estante.example/</loc>"));
  assert.ok(body.includes("<loc>https://estante.example/login</loc>"));
  assert.ok(!body.includes("/livro/"));
});

test("llms.txt é Markdown público com links absolutos", async () => {
  const res = await app.request("/llms.txt");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /text\/markdown/);
  const body = await res.text();
  assert.match(body, /^# Estante\n/);
  assert.ok(body.includes("](https://estante.example/login)"));
  assert.ok(!body.includes("](/"));
});
