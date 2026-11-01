import { IconStar } from "./Icons";

interface Props {
  value: number | null | undefined;
  onChange?: (v: number | null) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: 14, md: 22, lg: 34 };

/** Avaliação de 1 a 5 estrelas. Com onChange vira interativo; tocar na estrela atual limpa a nota. */
export function Stars({ value, onChange, size = "md", className = "" }: Props) {
  const px = SIZES[size];
  const v = value ?? 0;
  const interactive = Boolean(onChange);
  return (
    <div className={`inline-flex items-center ${interactive ? "gap-1" : "gap-0.5"} ${className}`} role={interactive ? "radiogroup" : undefined} aria-label={interactive ? "Avaliação" : `Avaliação: ${v} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= v;
        const cls = `${filled ? "text-accent-500" : "text-stone-300 dark:text-stone-600"}`;
        if (!interactive) return <IconStar key={n} width={px} height={px} filled={filled} className={cls} />;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={v === n}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            onClick={() => onChange?.(v === n ? null : n)}
            className={`-m-1 rounded-lg p-1 transition active:scale-90 ${cls}`}
          >
            <IconStar width={px} height={px} filled={filled} />
          </button>
        );
      })}
    </div>
  );
}
