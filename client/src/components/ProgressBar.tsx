/** Barra fina de progresso de leitura (0 a 100). */
export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800 ${className}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% lido`}
    >
      <div className="h-full rounded-full bg-accent-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
