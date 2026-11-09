import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QueryObserver, type QueryClient } from "@tanstack/react-query";
import { apiErrorMessage, setLocale, t, tp, type Locale } from "../client/src/lib/i18n.ts";
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
  "client/src/components/TermsGate.tsx",
  "client/src/components/ReportSheet.tsx",
  "client/src/pages/Login.tsx",
  "client/src/pages/Profile.tsx",
  "client/src/pages/Friends.tsx",
  "client/src/pages/FriendDetail.tsx",
  "client/src/pages/FriendInvite.tsx",
  "client/src/pages/Moderation.tsx",
];

const read = (file: string) => readFileSync(file, "utf8");

// caminho em variável: o tsconfig de tests (node16) não aceita os imports sem extensão de api.ts
const API_MODULE = "../client/src/lib/api.ts";
const { queryClient, resetErroredQueries } = (await import(API_MODULE)) as { queryClient: QueryClient; resetErroredQueries: () => void };

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

test("erro em cache é refeito no idioma novo; consulta sem erro fica como está", async () => {
  setLocale("en");
  const ok = ["ok"];
  queryClient.setQueryData(ok, "kept");
  const observer = new QueryObserver<string, Error>(queryClient, {
    queryKey: ["failing"],
    retry: false,
    queryFn: () => { throw new Error(apiErrorMessage("NOT_FOUND", 404)); },
  });
  const errorSeen = () => new Promise<string>((resolve) => {
    const stop = observer.subscribe((result) => {
      if (result.status === "error") { stop(); resolve(result.error.message); }
    });
  });
  const keepActive = observer.subscribe(() => {});
  try {
    assert.equal(await errorSeen(), "Not found");
    setLocale("es");
    const next = errorSeen();
    resetErroredQueries();
    assert.equal(await next, "No se encontró");
    assert.equal(queryClient.getQueryData(ok), "kept");
  } finally {
    keepActive();
    queryClient.clear();
    setLocale("en");
  }
});

test("main.tsx liga o reset à troca de idioma, depois de aplicar o inicial", () => {
  const main = read("client/src/main.tsx");
  const wired = main.indexOf("subscribe(resetErroredQueries)");
  assert.ok(wired > main.indexOf("applyLocale(initialLocale())"));
  assert.ok(wired < main.indexOf(".render("));
});

const PLURALS: [Locale, { and: string; suffix: [string, string, string]; counts: [string, string, string] }][] = [
  ["pt", { and: " e ", suffix: [" já leram", " já leu", " já leram"], counts: ["3 lendo · 0 lidos", "3 lendo · 1 lido", "3 lendo · 2 lidos"] }],
  ["en", { and: " and ", suffix: [" have read it", " has read it", " have read it"], counts: ["3 reading · 0 read", "3 reading · 1 read", "3 reading · 2 read"] }],
  ["es", { and: " y ", suffix: [" ya lo leyeron", " ya lo leyó", " ya lo leyeron"], counts: ["3 leyendo · 0 leídos", "3 leyendo · 1 leído", "3 leyendo · 2 leídos"] }],
];

for (const [locale, expected] of PLURALS) {
  test(`selo e contagem de amigos em ${locale}, com n = 0, 1 e 2`, () => {
    setLocale(locale);
    try {
      assert.equal(t("social.badge.and"), expected.and);
      for (const n of [0, 1, 2]) {
        assert.equal(tp("social.badge.suffix", n), expected.suffix[n]);
        assert.equal(tp("social.friend.counts", n, { reading: 3 }), expected.counts[n]);
      }
    } finally {
      setLocale("en");
    }
  });
}
