import { test } from "node:test";
import assert from "node:assert/strict";
import { initialYear } from "../client/src/lib/format.ts";

test("Anos abre no ano mais recente com livros lidos", () => {
  assert.equal(initialYear([{ year: 2024 }, { year: 2019 }], 2026), 2024);
});

test("Anos sem livros lidos abre no ano atual", () => {
  assert.equal(initialYear([], 2026), 2026);
});

test("Anos com livros no ano atual abre no ano atual", () => {
  assert.equal(initialYear([{ year: 2026 }], 2026), 2026);
});
