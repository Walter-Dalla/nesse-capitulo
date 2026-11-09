import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync("client/src/pages/Login.tsx", "utf8");
const icons = readFileSync("client/src/components/Icons.tsx", "utf8");

test("botão Google: tema claro oficial, sem variante escura", () => {
  const line = login.split("\n").find((l) => l.includes('href="/auth/google"'));
  assert.ok(line, "link /auth/google existe");
  for (const cls of ["bg-white", "text-[#1F1F1F]", "ring-[#747775]", "ring-inset"]) {
    assert.ok(line.includes(cls), `contém ${cls}`);
  }
  assert.ok(!line.includes("dark:"), "sem dark:");
  assert.ok(!/\bbtn\b/.test(line), "sem a classe btn");
});

test("botão Google: logo e texto inalterados", () => {
  assert.match(login, /<IconGoogle \/> \{t\("social\.login\.google"\)\}/);
  for (const color of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) {
    assert.ok(icons.includes(color), `IconGoogle mantém ${color}`);
  }
});
