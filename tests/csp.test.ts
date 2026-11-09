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

const EXPECTED_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: https://books.google.com https://covers.openlibrary.org https://archive.org https://*.archive.org https://*.googleusercontent.com; " +
  "connect-src 'self' https://books.google.com https://covers.openlibrary.org https://archive.org https://*.archive.org https://*.googleusercontent.com; " +
  "font-src 'self'; manifest-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; " +
  "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

for (const pathname of ["/api/health", "/"]) {
  test(`GET ${pathname} manda a Content-Security-Policy da Estante`, async () => {
    const res = await app.request(pathname);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-security-policy"), EXPECTED_CSP);
  });
}
