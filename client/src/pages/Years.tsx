import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookCard } from "../components/BookCard";
import { IconPlus } from "../components/Icons";
import { Empty, ErrorBox, Page, Spinner } from "../components/Layout";
import { useShelf, useStats } from "../lib/hooks";
import { currentYear, plural } from "../lib/format";

export function YearsPage() {
  const [params, setParams] = useSearchParams();
  const stats = useStats();
  const now = currentYear();
  const year = Number(params.get("ano")) || now;
  const shelf = useShelf({ year });
  const [custom, setCustom] = useState(false);

  const years = Array.from(new Set([now, ...(stats.data?.years.map((y) => y.year) ?? []), year])).sort((a, b) => b - a);
  const y = stats.data?.years.find((s) => s.year === year);

  return (
    <Page title="Leituras por ano">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3" role="tablist" aria-label="Ano">
        {years.map((yr) => (
          <button key={yr} type="button" role="tab" aria-selected={year === yr} onClick={() => setParams({ ano: String(yr) }, { replace: true })} className={year === yr ? "chip-on" : "chip-off"}>
            {yr}
          </button>
        ))}
        {custom ? (
          <input
            type="number" inputMode="numeric" min={1900} max={now} autoFocus
            className="input !min-h-9 w-24 !rounded-full !py-0"
            placeholder="Ano"
            onBlur={() => setCustom(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = Number((e.target as HTMLInputElement).value);
                if (v >= 1900 && v <= now) { setParams({ ano: String(v) }, { replace: true }); setCustom(false); }
              }
            }}
          />
        ) : (
          <button type="button" onClick={() => setCustom(true)} className="chip-off" aria-label="Outro ano"><IconPlus width={18} height={18} /> Outro ano</button>
        )}
      </div>

      <div className="card grid grid-cols-3 divide-x divide-stone-200 p-3 text-center dark:divide-stone-800">
        <Stat value={y?.books ?? 0} label={y?.books === 1 ? "livro" : "livros"} />
        <Stat value={y?.pages ?? 0} label="páginas" />
        <Stat value={y?.avgRating ? y.avgRating.toFixed(1) : "–"} label="nota média" />
      </div>

      <Link to={`/buscar?ano=${year}`} className="btn-secondary mt-3 w-full">
        <IconPlus width={18} height={18} /> Registrar livro lido em {year}
      </Link>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-stone-500">{y ? plural(y.books, "leitura", "leituras") : "Leituras"} em {year}</h2>
      {shelf.isPending ? (
        <Spinner />
      ) : shelf.isError ? (
        <ErrorBox error={shelf.error} retry={() => shelf.refetch()} />
      ) : shelf.data.items.length === 0 ? (
        <Empty title={`Nenhuma leitura registrada em ${year}`} hint="Você pode registrar leituras antigas: só o ano já basta." />
      ) : (
        <ul className="fade-in space-y-2.5">
          {shelf.data.items.map((item) => <li key={item.id}><BookCard item={item} /></li>)}
        </ul>
      )}
    </Page>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="px-1">
      <p className="text-2xl font-black tabular-nums tracking-tight">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
