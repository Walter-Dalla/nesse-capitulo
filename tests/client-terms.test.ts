import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { social } from "../client/src/lib/messages/social.ts";

const read = (file: string) => readFileSync(file, "utf8");
const app = read("client/src/App.tsx");
const gate = read("client/src/components/TermsGate.tsx");
const hooks = read("client/src/lib/hooks.ts");
const api = read("client/src/lib/api.ts");

const GATE_LINE = 'if (!me.data.termsAccepted) return pathname === "/perfil" ? <Outlet /> : <TermsGate />;';

test("RequireAuth: gate de termos antes do convite guardado, com /perfil liberado", () => {
  const requireAuth = app.slice(app.indexOf("function RequireAuth()"), app.indexOf("export function App()"));
  const gateAt = requireAuth.indexOf(GATE_LINE);
  assert.ok(gateAt >= 0, "linha do gate presente em RequireAuth");
  const inviteAt = requireAuth.indexOf("pendingInviteRedirect(");
  assert.ok(inviteAt > gateAt, "gate antes de pendingInviteRedirect");
  // depois de exigir usuário: deslogado vai ao login, não ao gate
  assert.ok(requireAuth.indexOf('<Navigate to="/login" replace />') < gateAt);
});

test("TermsGate: links públicos por <a href>, sair, Perfil e aceite só com a caixa marcada", () => {
  assert.match(gate, /useLogout\(\)/);
  assert.match(gate, /useAcceptTerms\(\)/);
  assert.match(gate, /<a href="\/termos"/);
  assert.match(gate, /<a href="\/privacidade"/);
  assert.match(gate, /to="\/perfil"/);
  assert.match(gate, /type="checkbox"/);
  assert.match(gate, /disabled=\{!checked \|\| accept\.isPending\}/);
  assert.match(gate, /toast\(\(e as Error\)\.message, "error"\)/);
});

test("useAcceptTerms invalida ['me']; Api.me traz termsAccepted e isModerator", () => {
  const start = hooks.indexOf("export const useAcceptTerms");
  assert.ok(start >= 0);
  const body = hooks.slice(start, hooks.indexOf("\nexport ", start + 1));
  assert.match(body, /Api\.acceptTerms/);
  assert.match(body, /invalidateQueries\(\{ queryKey: \["me"\] \}\)/);
  const me = api.split("\n").find((l) => l.includes('("/api/me")'));
  assert.ok(me?.includes("termsAccepted: boolean") && me.includes("isModerator: boolean"), me);
});

test("TermsGate está na varredura de texto solto", () => {
  assert.match(read("tests/i18n-literals-social.test.ts"), /"client\/src\/components\/TermsGate\.tsx"/);
});

test("textos do gate nos 3 idiomas", () => {
  for (const key of ["social.terms.title", "social.terms.summary", "social.terms.check", "social.terms.accept", "social.terms.accepting", "social.terms.declineHint", "social.terms.goProfile"] as const) {
    for (const locale of ["pt", "en", "es"] as const) assert.ok(social[locale][key]?.trim(), `${locale} ${key}`);
    assert.notEqual(social.en[key], social.pt[key], `en ${key}`);
  }
});
