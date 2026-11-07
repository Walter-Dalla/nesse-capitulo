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

/** Nome de um amigo para exibir; sem nome, como no Perfil. */
export function displayName(user: { name: string | null }) {
  return user.name?.trim() || "Leitor(a)";
}

/** Texto do badge na tela do livro: "Ana já leu", "Ana e João já leram", "Ana, João e mais 2 já leram". */
export function friendsReadText(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} já leu`;
  if (names.length === 2) return `${names[0]} e ${names[1]} já leram`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2} já leram`;
}

/** Chip do cartão: "1 amigo leu", "2 amigos leram". */
export function friendsReadChip(count: number) {
  return count === 1 ? "1 amigo leu" : `${count} amigos leram`;
}

/** Data de um registro do servidor (SQLite grava em UTC, "AAAA-MM-DD HH:MM:SS") no fuso do aparelho. */
export function formatTimestamp(sqlUtc: string) {
  const d = new Date(`${sqlUtc.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

/** Percentual lido (0 a 100), ou null sem página atual ou sem total de páginas. */
export function readingPercent(currentPage: number | null | undefined, pageCount: number | null | undefined) {
  if (currentPage == null || !pageCount) return null;
  return Math.max(0, Math.min(100, Math.round((currentPage / pageCount) * 100)));
}

/** "Pág. 120 de 300 · 40%", "Pág. 120" sem total; "" sem página. */
export function pageProgressText(currentPage: number | null | undefined, pageCount: number | null | undefined) {
  if (currentPage == null) return "";
  const pct = readingPercent(currentPage, pageCount);
  return pct === null ? `Pág. ${currentPage}` : `Pág. ${currentPage} de ${pageCount} · ${pct}%`;
}
