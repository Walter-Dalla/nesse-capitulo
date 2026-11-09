import { useState, type FormEvent } from "react";
import { useReport } from "../lib/hooks";
import { t, type MessageKey } from "../lib/i18n";
import { REPORT_REASONS, type ReportReason } from "../lib/types";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

const DETAILS_MAX = 500;
const REASON_LABEL: Record<ReportReason, MessageKey> = {
  spam: "social.report.reason.spam",
  harassment: "social.report.reason.harassment",
  sexual: "social.report.reason.sexual",
  other: "social.report.reason.other",
};

type Props = { target: { commentId: string } | { userId: string }; onClose: () => void };

/** Denúncia de um comentário de amigo ou de uma pessoa; vai para a moderação (`POST /api/reports`). */
export function ReportSheet({ target, onClose }: Props) {
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    try {
      const text = details.trim();
      await report.mutateAsync({ ...target, reason, ...(text ? { details: text } : {}) });
      toast(t("social.report.sent"));
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const title = "commentId" in target ? t("social.report.titleComment") : t("social.report.titleUser");

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2" disabled={report.isPending}>
          <legend className="label">{t("social.report.reasonLabel")}</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-sm">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 accent-accent-500" />
              {t(REASON_LABEL[r])}
            </label>
          ))}
        </fieldset>
        <div>
          <label className="label" htmlFor="report-details">{t("social.report.details")}</label>
          <textarea id="report-details" className="input min-h-20 resize-y py-2.5" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX))} disabled={report.isPending} />
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">{t("social.report.hint")}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={report.isPending} className="btn-secondary flex-1">{t("base.cancel")}</button>
          <button type="submit" disabled={!reason || report.isPending} className="btn-primary flex-1">{report.isPending ? t("social.report.sending") : t("social.report.submit")}</button>
        </div>
      </form>
    </Sheet>
  );
}
