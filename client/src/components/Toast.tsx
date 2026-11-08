import { useEffect, useSyncExternalStore } from "react";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; message: string; kind: "info" | "error"; action?: ToastAction };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() { for (const l of listeners) l(); }

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** Aviso passageiro; com `action`, fica mais tempo e oferece um atalho (ex.: "Ver livro"). */
export function toast(message: string, kind: Toast["kind"] = "info", action?: ToastAction) {
  const id = ++seq;
  toasts = [...toasts, { id, message, kind, action }];
  emit();
  setTimeout(() => dismiss(id), kind === "error" ? 4500 : action ? 5000 : 2500);
}

export function Toaster() {
  const list = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => toasts);
  useEffect(() => () => { toasts = []; }, []);
  if (list.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`fade-in pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.kind === "error" ? "bg-red-600 text-white" : "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"}`}>
          <span>{t.message}</span>
          {t.action && (
            <button type="button" onClick={() => { dismiss(t.id); t.action?.onClick(); }} className="shrink-0 font-bold text-accent-400 dark:text-accent-700">
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
