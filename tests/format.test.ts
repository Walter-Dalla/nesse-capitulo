import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimestamp, pageProgressText, readingPercent, updatedAgoText } from "../client/src/lib/format.ts";

test("percentual lido", () => {
  assert.equal(readingPercent(120, 300), 40);
  assert.equal(readingPercent(0, 300), 0);
  assert.equal(readingPercent(1, 3), 33);
  assert.equal(readingPercent(350, 300), 100);
  assert.equal(readingPercent(null, 300), null);
  assert.equal(readingPercent(undefined, 300), null);
  assert.equal(readingPercent(10, null), null);
  assert.equal(readingPercent(10, 0), null);
});

test("texto de progresso", () => {
  assert.equal(pageProgressText(120, 300), "Pág. 120 de 300 · 40%");
  assert.equal(pageProgressText(120, null), "Pág. 120");
  assert.equal(pageProgressText(0, 300), "Pág. 0 de 300 · 0%");
  assert.equal(pageProgressText(null, 300), "");
});

test("tempo desde a última atualização, em dias", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  assert.equal(updatedAgoText("2026-11-10 09:00:00", now), "Atualizado hoje");
  assert.equal(updatedAgoText("2026-11-09 23:00:00", now), "Atualizado ontem");
  assert.equal(updatedAgoText("2026-11-07 12:00:00", now), "Atualizado há 3 dias");
  assert.equal(updatedAgoText("lixo", now), "");
});

test("data do servidor (UTC do SQLite) no formato brasileiro", () => {
  assert.equal(formatTimestamp("2026-11-07 12:00:00"), "07/11/2026");
  assert.equal(formatTimestamp("lixo"), "");
});
