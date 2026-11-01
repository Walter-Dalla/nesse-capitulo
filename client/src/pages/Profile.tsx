import { useNavigate } from "react-router";
import { Page } from "../components/Layout";
import { useLogout, useMe, useStats } from "../lib/hooks";
import { STATUS_LABEL, STATUS_ORDER } from "../lib/types";

export function ProfilePage() {
  const me = useMe();
  const stats = useStats();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = me.data?.user;
  const totalRead = stats.data?.years.reduce((a, y) => a + y.books, 0) ?? 0;
  const totalPages = stats.data?.years.reduce((a, y) => a + y.pages, 0) ?? 0;

  return (
    <Page title="Perfil">
      <section className="card flex items-center gap-4 p-4">
        {user?.picture ? (
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-2xl font-bold text-stone-950">{(user?.name ?? "?").slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user?.name ?? "Leitor(a)"}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">{user?.email}</p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-3xl font-black tabular-nums">{totalRead}</p><p className="text-xs text-stone-500">livros lidos no total</p></div>
        <div className="card p-4"><p className="text-3xl font-black tabular-nums">{totalPages.toLocaleString("pt-BR")}</p><p className="text-xs text-stone-500">páginas lidas</p></div>
      </section>

      <section className="card mt-4 divide-y divide-stone-100 dark:divide-stone-800">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{STATUS_LABEL[s]}</span>
            <span className="font-semibold tabular-nums">{stats.data?.counts[s] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-center text-xs text-stone-500">
          No celular, use “Adicionar à tela inicial” no menu do navegador para instalar o app.
        </p>
        <button
          type="button"
          onClick={async () => { await logout.mutateAsync(); navigate("/login", { replace: true }); }}
          disabled={logout.isPending}
          className="btn-danger w-full"
        >
          Sair da conta
        </button>
      </section>
    </Page>
  );
}
