import { test } from "node:test";
import assert from "node:assert/strict";
import { preloadOnce, schedulePreload } from "../client/src/lib/preload.ts";

test("preload com economia de dados não agenda nada", () => {
  let loads = 0;
  let idles = 0;
  schedulePreload(() => loads++, { saveData: true, idle: (cb) => { idles++; cb(); } });
  assert.equal(loads, 0);
  assert.equal(idles, 0);
});

test("preload com requestIdleCallback roda load uma vez", () => {
  let loads = 0;
  schedulePreload(() => loads++, { idle: (cb) => cb() });
  assert.equal(loads, 1);
});

test("preload sem requestIdleCallback roda load após o atraso", async () => {
  let loads = 0;
  schedulePreload(() => loads++, { delayMs: 0 });
  assert.equal(loads, 0);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(loads, 1);
});

test("preloadOnce chamado duas vezes roda load uma vez", () => {
  let loads = 0;
  const env = { idle: (cb: () => void) => cb() };
  preloadOnce(() => loads++, env);
  preloadOnce(() => loads++, env);
  assert.equal(loads, 1);
});
