import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { social } from "../client/src/lib/messages/social.ts";

const read = (file: string) => readFileSync(file, "utf8");
const sheet = read("client/src/components/ReportSheet.tsx");
const comments = read("client/src/components/Comments.tsx");
const friendDetail = read("client/src/pages/FriendDetail.tsx");
const friends = read("client/src/pages/Friends.tsx");
const hooks = read("client/src/lib/hooks.ts");

function exported(src: string, name: string) {
  const start = src.indexOf(`export const ${name} =`);
  assert.ok(start >= 0, `${name} existe`);
  const end = src.indexOf("\nexport ", start + 1);
  return src.slice(start, end < 0 ? undefined : end);
}

test("ReportSheet: 4 motivos de REPORT_REASONS, detalhes até 500, toast no sucesso", () => {
  assert.match(sheet, /target: \{ commentId: string \} \| \{ userId: string \}; onClose: \(\) => void/);
  assert.match(sheet, /REPORT_REASONS\.map/);
  for (const r of ["spam", "harassment", "sexual", "other"]) assert.match(sheet, new RegExp(`${r}: "social\\.report\\.reason\\.${r}"`));
  assert.match(sheet, /maxLength=\{500\}/);
  assert.match(sheet, /toast\(t\("social\.report\.sent"\)\)/);
});

test("Comments: Denunciar só nos comentários de amigos", () => {
  assert.match(comments, /<ReportSheet target=\{\{ commentId: reporting \}\}/);
  const mineStart = comments.indexOf("mine.map(");
  const friendsStart = comments.indexOf("friends.map(");
  assert.ok(mineStart >= 0 && friendsStart > mineStart);
  assert.doesNotMatch(comments.slice(mineStart, friendsStart), /setReporting|social\.report/);
  assert.match(comments.slice(friendsStart), /setReporting\(c\.id\)/);
});

test("FriendDetail: denunciar comentário e pessoa, bloquear com confirmação e volta para /amigos", () => {
  assert.match(friendDetail, /<ReportSheet target=\{reportTarget\}/);
  const row = friendDetail.slice(friendDetail.indexOf("function FriendBookRow"), friendDetail.indexOf("export function FriendDetailPage"));
  assert.match(row, /onReport\(c\.id\)/);
  assert.match(friendDetail, /setReportTarget\(\{ userId: id \}\)/);
  assert.match(friendDetail, /<Sheet title=\{t\("social\.block\.action"\)\}/);
  const onBlock = friendDetail.slice(friendDetail.indexOf("async function onBlock"));
  assert.match(onBlock, /block\.mutateAsync\(id\);[\s\S]*navigate\("\/amigos", \{ replace: true \}\)/);
});

test("Friends: seção de bloqueados só com itens, com Desbloquear", () => {
  assert.match(friends, /blocks\.data && blocks\.data\.blocks\.length > 0 &&/);
  assert.match(friends, /unblock\.mutateAsync\(userId\)/);
  assert.match(friends, /t\("social\.friends\.unblock"\)/);
});

test("hooks: chaves e invalidações de denúncia e bloqueio", () => {
  const report = exported(hooks, "useReport");
  assert.match(report, /Api\.report\(/);
  assert.match(report, /queryKey: \["comments"\]/);
  assert.match(report, /queryKey: \["friends"\]/);
  const block = exported(hooks, "useBlock");
  assert.match(block, /Api\.blockFriend\(/);
  assert.match(block, /queryKey: \["friends", "detail", userId\], refetchType: "none"/);
  assert.match(block, /predicate: \(q\) => !\(q\.queryKey\[1\] === "detail" && q\.queryKey\[2\] === userId\)/);
  assert.match(exported(hooks, "useBlocks"), /queryKey: \["friends", "blocks"\], queryFn: Api\.blocks/);
  const unblock = exported(hooks, "useUnblock");
  assert.match(unblock, /Api\.unblock\(/);
  assert.match(unblock, /invalidateQueries\(\{ queryKey: \["friends"\] \}\)/);
});

test("ReportSheet está na varredura de texto solto", () => {
  assert.match(read("tests/i18n-literals-social.test.ts"), /"client\/src\/components\/ReportSheet\.tsx"/);
});

test("textos de denúncia e bloqueio nos 3 idiomas", () => {
  const keys = Object.keys(social.pt).filter((k) => /^social\.(report|block)\.|^social\.friends\.(blocked|unblock)/.test(k)) as (keyof typeof social.pt)[];
  assert.ok(keys.length >= 21, `${keys.length} chaves`);
  for (const key of keys) {
    for (const locale of ["pt", "en", "es"] as const) assert.ok(social[locale][key]?.trim(), `${locale} ${key}`);
    assert.notEqual(social.en[key], social.pt[key], `en ${key}`);
  }
});
