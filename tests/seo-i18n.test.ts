import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.BASE_URL = "https://estante.example";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");
const { PUBLIC_PATHS } = await import("../server/routes/seo.ts");

const app = createApp(openDatabase(":memory:"));

test("llms.txt em EN cita os 3 idiomas e não diz mais em português", async () => {
  const body = await (await app.request("/llms.txt")).text();
  assert.ok(body.includes("Portuguese, English and Spanish"));
  assert.ok(body.includes("Reading tracker"));
  assert.doesNotMatch(body, /em português|Tracker de leituras|Páginas públicas/);
  assert.ok(body.includes("](https://estante.example/login)"));
});

test("sitemap.xml lista a home em PT e ES além das páginas públicas", async () => {
  const body = await (await app.request("/sitemap.xml")).text();
  const locs = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    "https://estante.example/",
    "https://estante.example/login",
    "https://estante.example/privacidade",
    "https://estante.example/termos",
    "https://estante.example/excluir-conta",
    "https://estante.example/?lang=pt",
    "https://estante.example/?lang=es",
  ]);
});

test("PUBLIC_PATHS tem as páginas legais e robots.txt não cita lang", async () => {
  assert.deepEqual([...PUBLIC_PATHS], ["/", "/login", "/privacidade", "/termos", "/excluir-conta"]);
  const body = await (await app.request("/robots.txt")).text();
  assert.doesNotMatch(body, /lang=/);
});
