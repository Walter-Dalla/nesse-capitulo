import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAcceptTerms, useLogout } from "../lib/hooks";
import { t } from "../lib/i18n";
import { Page } from "./Layout";
import { toast } from "./Toast";

/**
 * Tela no lugar do app enquanto a pessoa não aceitou a versão atual dos termos (RequireAuth).
 * Quem recusa sai ou vai ao Perfil, única rota liberada, onde está a exclusão da conta.
 */
export function TermsGate() {
  const accept = useAcceptTerms();
  const logout = useLogout();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  async function onAccept() {
    try {
      await accept.mutateAsync();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function onLogout() {
    try {
      await logout.mutateAsync();
      navigate("/login", { replace: true });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Page title={t("social.terms.title")} nav={false}>
      <section className="card space-y-3 p-4 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
        <p>{t("social.terms.summary")}</p>
        {/* páginas públicas fora do SPA: navegação completa, o roteador mandaria para "/" */}
        <p className="flex flex-wrap gap-4 font-semibold">
          <a href="/termos" className="text-accent-700 underline dark:text-accent-400">{t("social.legal.terms")}</a>
          <a href="/privacidade" className="text-accent-700 underline dark:text-accent-400">{t("social.legal.privacy")}</a>
        </p>
      </section>

      <label className="card mt-4 flex items-start gap-3 p-4 text-sm">
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-accent-500" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t("social.terms.check")}</span>
      </label>

      <section className="mt-6 space-y-3 pb-4">
        <button type="button" onClick={onAccept} disabled={!checked || accept.isPending} className="btn-primary w-full">
          {accept.isPending ? t("social.terms.accepting") : t("social.terms.accept")}
        </button>
        <button type="button" onClick={onLogout} disabled={logout.isPending} className="btn-secondary w-full">{t("social.profile.logout")}</button>
        <p className="text-center text-xs text-stone-500 dark:text-stone-400">
          {t("social.terms.declineHint")}{" "}
          <Link to="/perfil" className="font-semibold text-accent-700 underline dark:text-accent-400">{t("social.terms.goProfile")}</Link>
        </p>
      </section>
    </Page>
  );
}
