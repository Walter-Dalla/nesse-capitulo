import { useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Api, queryClient } from "../lib/api";
import { useMe, useProviders } from "../lib/hooks";
import { browserInviteStore, readPendingInvite } from "../lib/pendingInvite";
import { IconGoogle } from "../components/Icons";
import { toast } from "../components/Toast";

const ERRORS: Record<string, string> = {
  state: "A autenticação expirou. Tente de novo.",
  token: "Não foi possível concluir o login com o Google.",
  access_denied: "Você cancelou o login.",
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
      const name = devName.trim() || "Leitor(a)";
      const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".") || "dev"}@dev.local`;
      await Api.devLogin(name, email);
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
        <h1 className="mt-6 text-4xl font-black tracking-tight">Estante</h1>
        <p className="mt-3 max-w-xs text-stone-600 dark:text-stone-300">
          Seus livros lidos, em andamento, na fila e abandonados. Com nota, resenha e histórico por ano.
        </p>
      </div>

      <div className="space-y-3">
        {pendingInvite && (
          <p className="rounded-xl bg-accent-100 px-4 py-3 text-center text-sm font-medium text-accent-700 dark:bg-accent-700/30 dark:text-accent-200">Entre para ver o convite de amizade.</p>
        )}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{ERRORS[error] ?? "Falha no login."}</p>}

        {providers.data?.google ? (
          <a href="/auth/google" className="btn w-full bg-white text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700">
            <IconGoogle /> Entrar com Google
          </a>
        ) : providers.isSuccess ? (
          <p className="text-center text-xs text-stone-500">Login Google não configurado neste servidor (veja GOOGLE_CLIENT_ID no .env).</p>
        ) : null}

        {providers.data?.dev && (
          <div className="card space-y-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Modo desenvolvimento</p>
            <input className="input" placeholder="Seu nome (opcional)" value={devName} onChange={(e) => setDevName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && devLogin()} />
            <button type="button" onClick={devLogin} disabled={busy} className="btn-secondary w-full">Entrar sem Google</button>
          </div>
        )}

        <p className="pt-2 text-center text-xs text-stone-400">Seus dados ficam na sua conta. Amigos veem o que você está lendo, já leu e os comentários que você deixar públicos.</p>
      </div>
    </div>
  );
}
