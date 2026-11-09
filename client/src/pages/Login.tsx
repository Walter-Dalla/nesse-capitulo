import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Api, queryClient } from "../lib/api";
import { useMe, useProviders } from "../lib/hooks";
import { t, type MessageKey } from "../lib/i18n";
import { browserInviteStore, readPendingInvite } from "../lib/pendingInvite";
import { IconGoogle } from "../components/Icons";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { toast } from "../components/Toast";

const ERRORS: Record<string, MessageKey> = {
  state: "social.login.error.state",
  token: "social.login.error.token",
  access_denied: "social.login.error.accessDenied",
};

export function LoginPage() {
  const me = useMe();
  const providers = useProviders();
  const [params] = useSearchParams();
  const [devName, setDevName] = useState("");
  const [busy, setBusy] = useState(false);
  const error = params.get("error");
  const pendingInvite = readPendingInvite(browserInviteStore()) !== null;

  if (me.data?.user) return <Navigate to="/" replace />;

  async function devLogin() {
    setBusy(true);
    try {
      const typed = devName.trim();
      // sem nome digitado a base é fixa: se seguisse o idioma, cada idioma criaria outra conta
      const emailBase = typed ? typed.toLowerCase().replace(/[^a-z0-9]+/g, ".") || "dev" : "leitor.a.";
      await Api.devLogin(typed || t("base.reader"), `${emailBase}@dev.local`);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="fade-in mt-10 flex flex-col items-center text-center">
        <img src="/icons/icon.svg" alt="" width={96} height={96} className="rounded-3xl shadow-lg" />
        <h1 className="mt-6 text-4xl font-black tracking-tight">{t("base.appName")}</h1>
        <p className="mt-3 max-w-xs text-stone-600 dark:text-stone-300">
          {t("social.login.tagline")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-center">
          <LanguageSwitch />
        </div>
        {pendingInvite && (
          <p className="rounded-xl bg-accent-100 px-4 py-3 text-center text-sm font-medium text-accent-700 dark:bg-accent-700/30 dark:text-accent-200">{t("social.login.invitePending")}</p>
        )}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{t(Object.hasOwn(ERRORS, error) ? ERRORS[error] : "social.login.error.generic")}</p>}

        {providers.data?.google ? (
          <a href="/auth/google" className="inline-flex w-full min-h-11 items-center justify-center gap-2.5 rounded-full bg-white px-3 text-sm font-medium text-[#1F1F1F] ring-1 ring-inset ring-[#747775] hover:bg-stone-50">
            <IconGoogle /> {t("social.login.google")}
          </a>
        ) : providers.isSuccess ? (
          <p className="text-center text-xs text-stone-500">{t("social.login.googleMissing")}</p>
        ) : null}

        {providers.data?.dev && (
          <div className="card space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("social.login.devMode")}</p>
            <input className="input" placeholder={t("social.login.devName")} value={devName} onChange={(e) => setDevName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && devLogin()} />
            <button type="button" onClick={devLogin} disabled={busy} className="btn-secondary w-full">{t("social.login.devSubmit")}</button>
          </div>
        )}

        <p className="pt-2 text-center text-xs text-stone-400">{t("social.login.privacy")}</p>
      </div>
    </div>
  );
}
