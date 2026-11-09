import { intlTag, t, tp } from "./i18n.js";

export function formatAuthors(authors: string[] | undefined) {
  if (!authors || authors.length === 0) return t("base.authors.unknown");
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return t("base.authors.two", { first: authors[0], second: authors[1] });
  return t("base.authors.others", { first: authors[0] });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(intlTag());
}

export function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const currentYear = () => new Date().getFullYear();

/** Ano em que a tela Anos abre: o mais recente com livros lidos (`GET /api/stats` lista os anos em ordem decrescente); sem livros lidos, o ano atual. */
export function initialYear(years: { year: number }[], now: number): number {
  return years[0]?.year ?? now;
}

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

/** Página do livro na fonte (Google Books ou Open Library); null no cadastro manual ou sem id na fonte. */
export function bookSourceUrl(book: { source: string; sourceId?: string | null }): string | null {
  if (!book.sourceId) return null;
  const id = encodeURIComponent(book.sourceId);
  if (book.source === "google") return `https://books.google.com/books?id=${id}`;
  if (book.source === "openlibrary") return `https://openlibrary.org/works/${id}`;
  return null;
}

/**
 * Rodapé da busca: "via Open Library" só com resultados dela, nada quando ela volta vazia ou a busca falha,
 * "Powered by Google" no resto (inclusive antes da primeira busca). Decide pela fonte, nunca pela contagem.
 */
export function searchAttribution(state: { provider?: string | null; itemCount: number; failed: boolean }): "via" | "poweredByGoogle" | null {
  if (state.provider === "openlibrary") return state.itemCount > 0 ? "via" : null;
  if (state.failed) return null;
  return "poweredByGoogle";
}

/** Nome de um amigo para exibir; sem nome, como no Perfil. */
export function displayName(user: { name: string | null }) {
  return user.name?.trim() || t("base.reader");
}

/** Texto do badge na tela do livro: "Ana já leu", "Ana e João já leram", "Ana, João e mais 2 já leram". */
export function friendsReadText(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return t("base.friends.readOne", { name: names[0] });
  if (names.length === 2) return t("base.friends.readTwo", { first: names[0], second: names[1] });
  return t("base.friends.readMany", { first: names[0], second: names[1], count: names.length - 2 });
}

/** Chip do cartão: "1 amigo leu", "2 amigos leram". */
export function friendsReadChip(count: number) {
  return tp("base.friends.readChip", count);
}

/** Data de um registro do servidor (SQLite grava em UTC, "AAAA-MM-DD HH:MM:SS") no fuso do aparelho. */
export function formatTimestamp(sqlUtc: string) {
  const d = new Date(`${sqlUtc.replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(intlTag());
}

/** "Atualizado hoje", "Atualizado ontem", "Atualizado há 3 dias" a partir de um timestamp do servidor. */
export function updatedAgoText(sqlUtc: string, now = new Date()) {
  const d = new Date(`${sqlUtc.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000));
  if (days === 0) return t("base.updated.today");
  if (days === 1) return t("base.updated.yesterday");
  return t("base.updated.days", { days });
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
  if (pct === null) return t("base.page.current", { page: currentPage });
  return t("base.page.progress", { page: currentPage, total: pageCount as number, percent: pct });
}
