import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { social } from "../client/src/lib/messages/social.ts";

const read = (file: string) => readFileSync(file, "utf8");
const hooks = read("client/src/lib/hooks.ts");
const profile = read("client/src/pages/Profile.tsx");
const login = read("client/src/pages/Login.tsx");

/** Corpo de `export const <name> = …` até o próximo export. */
function exported(src: string, name: string) {
  const start = src.indexOf(`export const ${name} =`);
  assert.ok(start >= 0, `${name} existe`);
  const end = src.indexOf("\nexport ", start + 1);
  return src.slice(start, end < 0 ? undefined : end);
}

test("logout e exclusão de conta limpam o aparelho pela mesma função", () => {
  assert.match(hooks, /function clearLocalAccount\(\)/);
  assert.match(exported(hooks, "useLogout"), /onSuccess: clearLocalAccount/);
  const del = exported(hooks, "useDeleteAccount");
  assert.match(del, /mutationFn: Api\.deleteAccount/);
  assert.match(del, /onSuccess: clearLocalAccount/);
  // só no sucesso: erro não pode limpar nada
  assert.doesNotMatch(del, /onError|onSettled/);
});

test("Perfil e Login levam a privacidade e termos por <a href>, nunca <Link>", () => {
  for (const [file, src] of [["Profile.tsx", profile], ["Login.tsx", login]]) {
    assert.match(src, /<a href="\/privacidade"/, file);
    assert.match(src, /<a href="\/termos"/, file);
    assert.doesNotMatch(src, /<Link[^>]*to="\/(privacidade|termos|excluir-conta)"/, file);
  }
});

test("Perfil: excluir conta pede confirmação com link /excluir-conta e volta ao login", () => {
  assert.match(profile, /useDeleteAccount\(\)/);
  assert.match(profile, /<Sheet title=\{t\("social\.profile\.delete"\)\}/);
  assert.match(profile, /<a href="\/excluir-conta"/);
  assert.match(profile, /!bg-red-600/);
  assert.match(profile, /navigate\("\/login", \{ replace: true \}\)/);
  const onDelete = profile.slice(profile.indexOf("async function onDelete"), profile.indexOf("return (", profile.indexOf("async function onDelete")));
  assert.match(onDelete, /catch \(e\) \{\s*setConfirmDelete\(false\);\s*toast\(/);
});

test("folha de exclusão cita os livros cadastrados à mão, como a política (deletionDeleted)", () => {
  assert.match(social.pt["social.profile.deleteWhat"], /livros cadastrados à mão/);
  assert.match(social.en["social.profile.deleteWhat"], /books you added by hand/);
  assert.match(social.es["social.profile.deleteWhat"], /libros registrados a mano/);
});

test("Login: conta suspensa tem mensagem própria", () => {
  assert.match(login, /banned: "social\.login\.error\.banned"/);
});

const KEYS = [
  "social.login.error.banned",
  "social.legal.privacy",
  "social.legal.terms",
  "social.profile.delete",
  "social.profile.deleteWhat",
  "social.profile.deleteIrreversible",
  "social.profile.deleteHelp",
  "social.profile.deleteAction",
  "social.profile.deleting",
  "social.profile.deleted",
] as const;

test("textos de conta nos 3 idiomas", () => {
  for (const key of KEYS) {
    for (const locale of ["pt", "en", "es"] as const) {
      const msg = (social[locale] as Record<string, string>)[key];
      assert.ok(typeof msg === "string" && msg.trim().length > 0, `${locale} ${key}`);
    }
    assert.notEqual(social.en[key], social.pt[key], `en ${key} traduzido`);
  }
});
