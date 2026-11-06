import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { BottomNav } from "./BottomNav";
import { IconBack } from "./Icons";

interface PageProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  nav?: boolean;
  padded?: boolean;
}

/** Container mobile-first: coluna centralizada (máx. 28rem no desktop), header opcional e bottom nav. */
export function Page({ title, action, children, nav = true, padded = true }: PageProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // idx é a posição que o React Router grava no histórico: 0 é a primeira tela aberta no app,
  // e voltar dali sairia dele
  const canGoBack = (window.history.state?.idx ?? 0) > 0;
  const showBack = canGoBack || pathname !== "/";
  return (
    <div className={`mx-auto min-h-dvh max-w-md ${nav ? "pb-24" : ""}`}>
      {(title || showBack || action) && (
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 bg-stone-50/90 px-3 backdrop-blur dark:bg-stone-950/90">
          {showBack && (
            <button type="button" onClick={() => (canGoBack ? navigate(-1) : navigate("/", { replace: true }))} className="-ml-1 rounded-xl p-2 text-stone-700 hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800" aria-label="Voltar">
              <IconBack />
            </button>
          )}
          {title && <h1 className="flex-1 truncate text-xl font-bold tracking-tight">{title}</h1>}
          {action}
        </header>
      )}
      <main className={padded ? "px-4" : ""}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center py-10 ${className}`} role="status" aria-label="Carregando">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-stone-300 border-t-accent-500 dark:border-stone-700 dark:border-t-accent-400" />
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="fade-in flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-4xl">📚</div>
      <p className="text-base font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-stone-500 dark:text-stone-400">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="card my-4 p-4 text-sm">
      <p className="font-semibold text-red-700 dark:text-red-300">Algo deu errado</p>
      <p className="mt-1 text-stone-600 dark:text-stone-300">{(error as Error)?.message ?? "Erro desconhecido"}</p>
      {retry && <button type="button" onClick={retry} className="btn-secondary mt-3">Tentar de novo</button>}
    </div>
  );
}
