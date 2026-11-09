import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { social } from "../client/src/lib/messages/social.ts";
import { findLiterals } from "./i18n-literals.ts";

const FILES = [
  "client/src/main.tsx",
  "client/src/App.tsx",
  "client/src/components/Layout.tsx",
  "client/src/components/Sheet.tsx",
  "client/src/components/BottomNav.tsx",
  "client/src/components/AdGate.tsx",
  "client/src/components/Comments.tsx",
  "client/src/components/FriendBadge.tsx",
  "client/src/pages/Login.tsx",
  "client/src/pages/Profile.tsx",
  "client/src/pages/Friends.tsx",
  "client/src/pages/FriendDetail.tsx",
  "client/src/pages/FriendInvite.tsx",
];

const read = (file: string) => readFileSync(file, "utf8");

for (const file of FILES) {
  test(`sem texto solto: ${file}`, () => {
    assert.deepEqual(findLiterals(read(file), true), []);
  });
}

test("o idioma é aplicado antes do primeiro render", () => {
  const main = read("client/src/main.tsx");
  const applied = main.indexOf("applyLocale(initialLocale())");
  assert.ok(applied >= 0);
  assert.ok(applied < main.indexOf(".render("));
});

test("trocar de idioma remonta o roteador sem derrubar o cache", () => {
  const app = read("client/src/App.tsx");
  const provider = app.indexOf("<QueryClientProvider");
  const router = app.indexOf("<BrowserRouter key={locale}>");
  assert.ok(provider >= 0 && router > provider);
});

test("o seletor de idioma está em Login e em Perfil", () => {
  for (const file of ["client/src/pages/Login.tsx", "client/src/pages/Profile.tsx"]) {
    assert.match(read(file), /<LanguageSwitch \/>/, file);
  }
});

test("o e-mail do login dev sem nome não depende do idioma", () => {
  assert.match(read("client/src/pages/Login.tsx"), /: "leitor\.a\.";/);
});

test("social: as variáveis de cada frase são as mesmas nos três idiomas", () => {
  const slots = (message: string) => (message.match(/\{\w+\}/g) ?? []).sort();
  for (const [key, message] of Object.entries(social.pt)) {
    assert.deepEqual(slots(social.en[key as keyof typeof social.pt]), slots(message), `en ${key}`);
    assert.deepEqual(slots(social.es[key as keyof typeof social.pt]), slots(message), `es ${key}`);
  }
});
