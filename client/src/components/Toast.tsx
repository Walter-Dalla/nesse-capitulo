import { useEffect, useSyncExternalStore } from "react";

type Toast = { id: number; message: string; kind: "info" | "error" };
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() { for (const l of listeners) l(); }

export function toast(message: string, kind: Toast["kind"] = "info") {
  const id = ++seq;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, kind === "error" ? 4500 : 2500);
}

export function Toaster() {
  const list = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => toasts);
  useEffect(() => () => { toasts = []; }, []);
  if (list.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`fade-in pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.kind === "error" ? "bg-red-600 text-white" : "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
