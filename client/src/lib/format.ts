export function formatAuthors(authors: string[] | undefined) {
  if (!authors || authors.length === 0) return "Autor desconhecido";
  if (authors.length <= 2) return authors.join(" e ");
  return `${authors[0]} e outros`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const currentYear = () => new Date().getFullYear();

export function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * Deriva a URL da capa a partir de referências curtas, sem guardar URLs nem imagens:
 *  - Google Books: pelo id do volume
 *  - Open Library: pelo cover id, ou pelo ISBN (qualquer fonte, inclusive livros manuais)
 */
export function coverUrlFor(book: { source: string; sourceId?: string | null; coverRef?: string | null; isbn13?: string | null }, size: "S" | "M" | "L" = "M"): string | null {
  if (book.coverRef === "g" && book.sourceId) {
    const zoom = size === "L" ? 2 : 1;
    return `https://books.google.com/books/content?id=${encodeURIComponent(book.sourceId)}&printsec=frontcover&img=1&zoom=${zoom}&source=gbs_api`;
  }
  if (book.coverRef?.startsWith("ol:")) return `https://covers.openlibrary.org/b/id/${book.coverRef.slice(3)}-${size}.jpg?default=false`;
  if (book.isbn13) return `https://covers.openlibrary.org/b/isbn/${book.isbn13}-${size}.jpg?default=false`;
  return null;
}
