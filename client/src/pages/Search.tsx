import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AddSheet } from "../components/AddSheet";
import { BookCover } from "../components/BookCover";
import { IconClose, IconPlus, IconSearch } from "../components/Icons";
import { Empty, Page, Spinner } from "../components/Layout";
import { useSearch } from "../lib/hooks";
import { formatAuthors } from "../lib/format";
import type { BookInput, Status } from "../lib/types";

export function SearchPage() {
  const [params] = useSearchParams();
  const defaultYear = params.get("ano") ? Number(params.get("ano")) : undefined;
  const defaultStatus = (params.get("status") as Status | null) ?? (defaultYear ? "read" : undefined);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [picked, setPicked] = useState<BookInput | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSearch(q);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const manualLink = `/adicionar?${new URLSearchParams({ ...(q ? { titulo: q } : {}), ...(defaultYear ? { ano: String(defaultYear) } : {}), ...(defaultStatus ? { status: defaultStatus } : {}) })}`;

  return (
    <Page title={defaultYear ? `Li em ${defaultYear}` : "Buscar livro"} back={Boolean(defaultYear)}>
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width={20} height={20} />
        <input
          ref={inputRef}
          type="search"
          className="input pl-10 pr-10"
          placeholder="Título, autor ou ISBN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700" aria-label="Limpar">
            <IconClose width={20} height={20} />
          </button>
        )}
      </div>

      {search.debounced.length < 2 ? (
        <Empty title="Procure um livro" hint="Digite o título ou o autor. Os resultados vêm do Google Books." action={<Link to={manualLink} className="btn-secondary mt-2"><IconPlus width={18} height={18} /> Adicionar manualmente</Link>} />
      ) : search.isPending ? (
        <Spinner />
      ) : search.isError ? (
        <div className="card p-4 text-sm">
          <p className="font-semibold">Busca indisponível</p>
          <p className="mt-1 text-stone-600 dark:text-stone-300">{(search.error as Error).message}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => search.refetch()} className="btn-secondary">Tentar de novo</button>
            <Link to={manualLink} className="btn-primary">Adicionar manualmente</Link>
          </div>
        </div>
      ) : search.data.items.length === 0 ? (
        <Empty title="Nenhum resultado" hint="Tente outro termo ou cadastre o livro você mesmo." action={<Link to={manualLink} className="btn-primary mt-2">Adicionar manualmente</Link>} />
      ) : (
        <>
          <ul className="fade-in space-y-2">
            {search.data.items.map((b) => (
              <li key={b.sourceId} className="card flex gap-3 p-3">
                <BookCover title={b.title} url={b.coverUrl} className="w-12" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{b.title}</p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">{formatAuthors(b.authors)}{b.publishedYear ? ` · ${b.publishedYear}` : ""}{b.pageCount ? ` · ${b.pageCount} pág.` : ""}</p>
                </div>
                <button type="button" onClick={() => setPicked(b)} className="btn-primary self-center !min-h-10 !px-3" aria-label={`Adicionar ${b.title}`}>
                  <IconPlus width={20} height={20} />
                </button>
              </li>
            ))}
          </ul>
          <p className="py-5 text-center text-sm text-stone-500">
            Não achou? <Link to={manualLink} className="font-semibold text-accent-700 underline dark:text-accent-400">Adicionar manualmente</Link>
          </p>
        </>
      )}

      {picked && <AddSheet book={picked} defaultStatus={defaultStatus} defaultYear={defaultYear} onClose={() => setPicked(null)} />}
    </Page>
  );
}
