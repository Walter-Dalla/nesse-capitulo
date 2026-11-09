import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

process.env.NODE_ENV = "test";
process.env.BASE_URL = "https://estante.example";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");
const { mountClient } = await import("../server/html.ts");

const db = openDatabase(":memory:");
const app = createApp(db);
mountClient(app, db, path.resolve("client"));

const text = async (pathname: string) => (await app.request(pathname)).text();

test("robots.txt libera as páginas legais e bloqueia /moderacao", async () => {
  const body = await text("/robots.txt");
  for (const p of ["/privacidade", "/termos", "/excluir-conta"]) assert.ok(body.includes(`Allow: ${p}\n`), p);
  assert.ok(body.includes("Disallow: /moderacao\n"));
});

test("sitemap.xml lista as 3 páginas legais com URL absoluta", async () => {
  const body = await text("/sitemap.xml");
  for (const p of ["/privacidade", "/termos", "/excluir-conta"]) assert.ok(body.includes(`<loc>https://estante.example${p}</loc>`), p);
});

test("llms.txt cita as páginas legais e não diz que só home e login são públicas", async () => {
  const body = await text("/llms.txt");
  for (const p of ["/privacidade", "/termos", "/excluir-conta"]) assert.ok(body.includes(`](https://estante.example${p})`), p);
  assert.equal(body.includes("only the home page and login are public"), false);
});

for (const locale of ["pt", "en", "es"]) {
  test(`home em ${locale} liga privacidade e termos`, async () => {
    const body = await text(`/?lang=${locale}`);
    assert.ok(body.includes('href="/privacidade"'));
    assert.ok(body.includes('href="/termos"'));
  });
}

test("signInGoogle saiu da home: o CTA âmbar não diz 'com Google'", () => {
  assert.equal(readFileSync("client/landing.html", "utf8").includes("signInGoogle"), false);
  assert.equal(readFileSync("server/landingText.ts", "utf8").includes("signInGoogle"), false);
});
