import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { social } from "../client/src/lib/messages/social.ts";

const read = (file: string) => readFileSync(file, "utf8");
const app = read("client/src/App.tsx");
const page = read("client/src/pages/Moderation.tsx");
const profile = read("client/src/pages/Profile.tsx");
const hooks = read("client/src/lib/hooks.ts");

test("rota /moderacao lazy, dentro de RequireAuth", () => {
  assert.match(app, /const ModerationPage = lazy\(\(\) => import\("\.\/pages\/Moderation"\)/);
  const authStart = app.indexOf("<Route element={<RequireAuth />}>");
  const authEnd = app.indexOf("</Route>", authStart);
  const route = app.indexOf('<Route path="/moderacao" element={<ModerationPage />} />');
  assert.ok(authStart >= 0 && route > authStart && route < authEnd, "rota entre as protegidas");
});

test("Moderation: sem isModerator volta para /, consulta só para moderador", () => {
  assert.match(page, /const isModerator = me\.data\?\.isModerator === true;/);
  assert.match(page, /useModReports\(isModerator\)/);
  assert.match(page, /if \(!isModerator\) return <Navigate to="\/" replace \/>;/);
  assert.match(hooks, /useQuery\(\{ queryKey: \["mod", "reports"\], queryFn: \(\) => Api\.modReports\(\), enabled,/);
});

test("Moderation: conteúdo denunciado como texto puro", () => {
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  assert.match(page, /whitespace-pre-wrap[^>]*>\{r\.commentBody\}/);
  assert.match(page, /whitespace-pre-wrap[^>]*>\{r\.details\}/);
});

test("Moderation: as 3 ações; remover só com commentId; remover e banir confirmam", () => {
  assert.match(page, /act\(r, "dismiss"\)/);
  assert.match(page, /\{r\.commentId && \(\s*<button[^\n]*action: "remove_comment"/);
  assert.match(page, /setConfirming\(\{ report: r, action: "ban_user" \}\)/);
  assert.match(page, /<Sheet title=/);
  assert.match(page, /act\(confirming\.report, confirming\.action\)/);
  assert.match(page, /<Empty title=\{t\("social\.mod\.empty"\)\}/);
  assert.match(page, /r\.reporter \? displayName\(r\.reporter\) : t\("social\.mod\.reporterDeleted"\)/);
  assert.match(page, /r\.reported\.email/);
  assert.match(hooks, /Api\.resolveReport\(id, action\)/);
});

test("Perfil: link de moderação só para moderador", () => {
  assert.match(profile, /\{me\.data\?\.isModerator && \(\s*<Link to="\/moderacao"/);
});

test("Moderation.tsx está na varredura de texto solto", () => {
  assert.match(read("tests/i18n-literals-social.test.ts"), /"client\/src\/pages\/Moderation\.tsx"/);
});

test("textos de moderação nos 3 idiomas", () => {
  const keys = Object.keys(social.pt).filter((k) => k.startsWith("social.mod.")) as (keyof typeof social.pt)[];
  assert.ok(keys.length >= 15, `${keys.length} chaves`);
  for (const key of keys) {
    for (const locale of ["pt", "en", "es"] as const) assert.ok(social[locale][key]?.trim(), `${locale} ${key}`);
    assert.notEqual(social.en[key], social.pt[key], `en ${key}`);
  }
});
