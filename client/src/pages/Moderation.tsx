import { useState } from "react";
import { Navigate } from "react-router";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { REASON_LABEL } from "../components/ReportSheet";
import { Sheet } from "../components/Sheet";
import { toast } from "../components/Toast";
import { displayName, formatTimestamp } from "../lib/format";
import { useMe, useModReports, useResolveReport } from "../lib/hooks";
import { t } from "../lib/i18n";
import type { ModerationAction, ModReport } from "../lib/types";

/** Ações que mudam algo para outra pessoa pedem confirmação; descartar não. */
type Confirming = { report: ModReport; action: Exclude<ModerationAction, "dismiss"> };

/**
 * Fila de denúncias abertas, só para moderador (`GET /api/mod/reports`).
 * Conteúdo denunciado é texto puro: renderizado como texto, nunca como HTML.
 */
export function ModerationPage() {
  const me = useMe();
  const isModerator = me.data?.isModerator === true;
  const reports = useModReports(isModerator);
  const resolve = useResolveReport();
  const [confirming, setConfirming] = useState<Confirming | null>(null);

  if (!isModerator) return <Navigate to="/" replace />;

  async function act(report: ModReport, action: ModerationAction) {
    try {
      await resolve.mutateAsync({ id: report.id, action });
      toast(t("social.mod.resolved"));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <Page title={t("social.mod.title")}>
      {reports.isPending ? (
        <Spinner />
      ) : reports.isError ? (
        <ErrorBox error={reports.error} retry={() => reports.refetch()} />
      ) : reports.data.reports.length === 0 ? (
        <Empty title={t("social.mod.empty")} hint={t("social.mod.emptyHint")} />
      ) : (
        <ul className="space-y-3">
          {reports.data.reports.map((r) => (
            <li key={r.id} className="card space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">{t(REASON_LABEL[r.reason])}</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">{formatTimestamp(r.createdAt)}</span>
              </div>
              {r.commentBody !== null && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{t("social.mod.comment")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words rounded-lg bg-stone-50 p-2 leading-relaxed dark:bg-stone-800/60">{r.commentBody}</p>
                </div>
              )}
              {r.details && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">{t("social.mod.details")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{r.details}</p>
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-stone-500 dark:text-stone-400">{t("social.mod.reported")}</dt>
                <dd className="min-w-0 break-words">{displayName(r.reported)}{r.reported.email ? ` · ${r.reported.email}` : ""}</dd>
                <dt className="text-stone-500 dark:text-stone-400">{t("social.mod.reporter")}</dt>
                <dd className="min-w-0 break-words">{r.reporter ? displayName(r.reporter) : t("social.mod.reporterDeleted")}</dd>
              </dl>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => act(r, "dismiss")} disabled={resolve.isPending} className="btn-secondary flex-1 text-sm">{t("social.mod.dismiss")}</button>
                {r.commentId && (
                  <button type="button" onClick={() => setConfirming({ report: r, action: "remove_comment" })} disabled={resolve.isPending} className="btn-secondary flex-1 text-sm">{t("social.mod.removeComment")}</button>
                )}
                <button type="button" onClick={() => setConfirming({ report: r, action: "ban_user" })} disabled={resolve.isPending} className="btn-secondary flex-1 text-sm !text-red-700 dark:!text-red-300">{t("social.mod.ban")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirming && (
        <Sheet title={confirming.action === "ban_user" ? t("social.mod.ban") : t("social.mod.removeComment")} onClose={() => setConfirming(null)}>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {confirming.action === "ban_user"
              ? t("social.mod.banConfirm", { name: displayName(confirming.report.reported) })
              : t("social.mod.removeCommentConfirm")}
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setConfirming(null)} disabled={resolve.isPending} className="btn-secondary flex-1">{t("base.cancel")}</button>
            <button type="button" onClick={() => act(confirming.report, confirming.action)} disabled={resolve.isPending} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">
              {resolve.isPending ? t("social.mod.resolving") : confirming.action === "ban_user" ? t("social.mod.ban") : t("social.mod.removeComment")}
            </button>
          </div>
        </Sheet>
      )}
    </Page>
  );
}
