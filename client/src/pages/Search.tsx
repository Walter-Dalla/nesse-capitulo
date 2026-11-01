import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AddSheet } from "../components/AddSheet";
import { BookCover } from "../components/BookCover";
import { IconClose, IconPlus, IconSearch } from "../components/Icons";
import { Empty, Page } from "../components/Layout";
import { SEARCH_MIN_CHARS, useSearch } from "../lib/hooks";
import { formatAuthors } from "../lib/format";
import { SOURCE_LABEL, type BookInput, type Status } from "../lib/types";

/**
 * Busca com autocompletar: as sugestões aparecem 1 s depois que o usuário para de digitar
 * (useSearch), com no mínimo 3 caracteres. Nada é consultado a cada tecla.
 */
export function SearchPage() {
  const [params] = useSearchParams();
  const defaultYear = params.get("ano") ? Number(params.get("ano")) : undefined;
  const defaultStatus = (params.get("status") as Status | null) ?? (defaultYear ? "read" : undefined);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [picked, setPicked] = useState<BookInput | null>(null);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useSearch(q);
  const items = search.data?.items ?? [];

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(-1); }, [search.debounced]);

  const manualLink = `/adicionar?${new URLSearchParams({ ...(q.trim() ? { titulo: q.trim() } : {}), ...(defaultYear ? { ano: String(defaultYear) } : {}), ...(defaultStatus ? { status: defaultStatus } : {}) })}`;
  const typing = q.trim().length > 0 && q.trim().length < SEARCH_MIN_CHARS;
  const showList = search.debounced.length >= SEARCH_MIN_CHARS;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); setPicked(items[active]); }
    else if (e.key === "Escape") { setQ(""); }
  }

  return (
    <Page title={defaultYear ? `Li em ${defaultYear}` : "Buscar livro"} back={Boolean(defaultYear)}>
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" width={20} height={20} />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList && items.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={active >= 0 ? `sug-${active}` : undefined}
          aria-autocomplete="list"
          className="input pl-10 pr-10"
          placeholder="Título, autor ou ISBN"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
        />
        {(search.waiting || search.isFetching) && (
          <span className="absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-stone-300 border-t-accent-500" aria-label="Buscando" />
        )}
        {q && (
          <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700" aria-label="Limpar">
            <IconClose width={20} height={20} />
          </button>
        )}
      </div>

      {!showList ? (
        <Empty
          title={typing ? `Digite pelo menos ${SEARCH_MIN_CHARS} letras` : "Procure um livro"}
          hint="As sugestões aparecem assim que você parar de digitar. Dados e capas vêm do Google Books e da Open Library."
          action={<Link to={manualLink} className="btn-secondary mt-2"><IconPlus width={18} height={18} /> Cadastrar manualmente</Link>}
        />
      ) : search.isError ? (
        <div className="card p-4 text-sm">
          <p className="font-semibold">Busca indisponível</p>
          <p className="mt-1 text-stone-600 dark:text-stone-300">{(search.error as Error).message}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => search.refetch()} className="btn-secondary">Tentar de novo</button>
            <Link to={manualLink} className="btn-primary">Cadastrar manualmente</Link>
          </div>
        </div>
      ) : (
        <ul id="search-suggestions" role="listbox" aria-label="Sugestões" className="card fade-in divide-y divide-stone-100 overflow-hidden dark:divide-stone-800">
          {search.isPending && (
            <li className="px-4 py-3 text-sm text-stone-500">Buscando “{search.debounced}”…</li>
          )}
          {items.map((b, i) => (
            <li
              key={`${b.source}:${b.sourceId}`}
              id={`sug-${i}`}
              role="option"
              aria-selected={active === i}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${active === i ? "bg-accent-50 dark:bg-stone-800" : "hover:bg-stone-50 dark:hover:bg-stone-800/60"}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => setPicked(b)}
            >
              <BookCover book={b} size="S" className="w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  {formatAuthors(b.authors)}{b.publishedYear ? ` · ${b.publishedYear}` : ""}{b.pageCount ? ` · ${b.pageCount} pág.` : ""}
                </p>
              </div>
              <IconPlus width={20} height={20} className="shrink-0 text-accent-600" />
            </li>
          ))}
          {search.isSuccess && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-stone-500">Nenhum livro encontrado para “{search.debounced}”.</li>
          )}
          <li>
            <Link to={manualLink} className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-accent-700 hover:bg-stone-50 dark:text-accent-400 dark:hover:bg-stone-800/60">
              <IconPlus width={20} height={20} /> Não achou? Cadastrar “{q.trim()}” manualmente
            </Link>
          </li>
        </ul>
      )}

      {search.data?.provider && items.length > 0 && (
        <p className="mt-3 text-center text-xs text-stone-400">Resultados via {SOURCE_LABEL[search.data.provider]}</p>
      )}

      {picked && <AddSheet book={picked} defaultStatus={defaultStatus} defaultYear={defaultYear} onClose={() => setPicked(null)} />}
    </Page>
  );
}
