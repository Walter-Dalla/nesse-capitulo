import { useEffect, type ReactNode } from "react";
import { t } from "../lib/i18n";
import { IconClose } from "./Icons";

interface Props { title: string; onClose: () => void; children: ReactNode }

/** Bottom sheet modal (fecha com Esc ou tocando no fundo). */
export function Sheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="fade-in absolute inset-0 bg-black/40" aria-label={t("social.close")} onClick={onClose} />
      <div className="sheet-in safe-bottom relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-stone-900 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 rounded-xl p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800" aria-label={t("social.close")}><IconClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
