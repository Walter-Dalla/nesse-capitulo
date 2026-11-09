import { useState } from "react";
import { useNavigate } from "react-router";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { Page } from "../components/Layout";
import { Sheet } from "../components/Sheet";
import { toast } from "../components/Toast";
import { useDeleteAccount, useLogout, useMe, useStats } from "../lib/hooks";
import { intlTag, t } from "../lib/i18n";
import { STATUS_LABEL, STATUS_ORDER } from "../lib/types";

export function ProfilePage() {
  const me = useMe();
  const stats = useStats();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onDelete() {
    try {
      await deleteAccount.mutateAsync();
      toast(t("social.profile.deleted"));
      navigate("/login", { replace: true });
    } catch (e) {
      setConfirmDelete(false);
      toast((e as Error).message, "error");
    }
  }
  const user = me.data?.user;
  const totalRead = stats.data?.years.reduce((a, y) => a + y.books, 0) ?? 0;
  const totalPages = stats.data?.years.reduce((a, y) => a + y.pages, 0) ?? 0;

  return (
    <Page title={t("social.profile.title")}>
      <section className="card flex items-center gap-4 p-4">
        {user?.picture ? (
          <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-2xl font-bold text-stone-950">{(user?.name ?? "?").slice(0, 1).toUpperCase()}</span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user?.name ?? t("base.reader")}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">{user?.email}</p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-4"><p className="text-3xl font-black tabular-nums">{totalRead}</p><p className="text-xs text-stone-500">{t("social.profile.booksRead")}</p></div>
        <div className="card p-4"><p className="text-3xl font-black tabular-nums">{totalPages.toLocaleString(intlTag())}</p><p className="text-xs text-stone-500">{t("social.profile.pagesRead")}</p></div>
      </section>

      <section className="card mt-4 divide-y divide-stone-100 dark:divide-stone-800">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{STATUS_LABEL[s]}</span>
            <span className="font-semibold tabular-nums">{stats.data?.counts[s] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className="card mt-4 flex items-center justify-between p-4">
        <span className="text-sm">{t("base.language.label")}</span>
        <LanguageSwitch />
      </section>

      {/* páginas públicas fora do SPA: navegação completa, o roteador mandaria para "/" */}
      <section className="card mt-4 divide-y divide-stone-100 text-sm dark:divide-stone-800">
        <a href="/privacidade" className="block px-4 py-3 hover:underline">{t("social.legal.privacy")}</a>
        <a href="/termos" className="block px-4 py-3 hover:underline">{t("social.legal.terms")}</a>
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-center text-xs text-stone-500">
          {t("social.profile.installHint")}
        </p>
        <button
          type="button"
          onClick={async () => { await logout.mutateAsync(); navigate("/login", { replace: true }); }}
          disabled={logout.isPending}
          className="btn-danger w-full"
        >
          {t("social.profile.logout")}
        </button>
        <button type="button" onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-semibold text-red-700 dark:text-red-300">
          {t("social.profile.delete")}
        </button>
      </section>

      {confirmDelete && (
        <Sheet title={t("social.profile.delete")} onClose={() => setConfirmDelete(false)}>
          <div className="space-y-2 text-sm text-stone-600 dark:text-stone-300">
            <p>{t("social.profile.deleteWhat")}</p>
            <p className="font-semibold text-red-700 dark:text-red-300">{t("social.profile.deleteIrreversible")}</p>
            <a href="/excluir-conta" className="inline-block font-semibold text-accent-700 hover:underline dark:text-accent-400">{t("social.profile.deleteHelp")}</a>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleteAccount.isPending} className="btn-secondary flex-1">{t("base.cancel")}</button>
            <button type="button" onClick={onDelete} disabled={deleteAccount.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">
              {deleteAccount.isPending ? t("social.profile.deleting") : t("social.profile.deleteAction")}
            </button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
