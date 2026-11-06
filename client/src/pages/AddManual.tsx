import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { AddSheet } from "../components/AddSheet";
import { Page } from "../components/Layout";
import type { BookInput, Status } from "../lib/types";

/** Cadastro manual de um livro que não foi encontrado na busca (sem upload de capa: só metadados). */
export function AddManualPage() {
  const [params] = useSearchParams();
  const [title, setTitle] = useState(params.get("titulo") ?? "");
  const [authors, setAuthors] = useState("");
  const [pages, setPages] = useState("");
  const [year, setYear] = useState("");
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<BookInput | null>(null);
  const defaultYear = params.get("ano") ? Number(params.get("ano")) : undefined;
  const defaultStatus = (params.get("status") as Status | null) ?? undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBook({
      source: "manual",
      title: title.trim(),
      authors: authors.split(/[,;]/).map((a) => a.trim()).filter(Boolean),
      pageCount: pages ? Number(pages) : null,
      publishedYear: year ? Number(year) : null,
      isbn13: isbn.replace(/[^0-9Xx]/g, "") || null,
    });
  }

  return (
    <Page title="Adicionar manualmente">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="m-title">Título *</label>
          <input id="m-title" className="input" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="m-authors">Autor(es)</label>
          <input id="m-authors" className="input" placeholder="Separe por vírgula" value={authors} onChange={(e) => setAuthors(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="m-pages">Páginas</label>
            <input id="m-pages" className="input" type="number" inputMode="numeric" min={1} max={100000} value={pages} onChange={(e) => setPages(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="m-year">Ano de publicação</label>
            <input id="m-year" className="input" type="number" inputMode="numeric" min={0} max={3000} value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="m-isbn">ISBN (opcional)</label>
          <input id="m-isbn" className="input" inputMode="numeric" placeholder="978…" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
          <p className="mt-1 text-xs text-stone-500">Com o ISBN a capa é buscada automaticamente na Open Library. Sem capa, o livro ganha uma capa colorida com o título.</p>
        </div>
        <button type="submit" className="btn-primary w-full">Continuar</button>
      </form>
      {book && <AddSheet book={book} defaultStatus={defaultStatus} defaultYear={defaultYear} onClose={() => setBook(null)} />}
    </Page>
  );
}
