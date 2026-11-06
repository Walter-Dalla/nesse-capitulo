import { BOOK_SOURCES, STATUSES, type BookInput, type BookSource, type Status } from "./types.js";

export class ValidationError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function optStr(v: unknown, field: string, max = 5000): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new ValidationError(`${field} deve ser texto`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(`${field} muito longo (máx. ${max})`);
  return s || null;
}

export function optInt(v: unknown, field: string, min: number, max: number): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new ValidationError(`${field} deve ser inteiro entre ${min} e ${max}`);
  }
  return n;
}

export function optDate(v: unknown, field: string): string | null {
  const s = optStr(v, field, 10);
  if (s === null) return null;
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) throw new ValidationError(`${field} deve estar no formato AAAA-MM-DD`);
  // mesma faixa de readYear: o ano da data de término vira o ano da leitura
  if (Number(s.slice(0, 4)) < 1000) throw new ValidationError(`${field} tem ano inválido`);
  return s;
}

export function parseStatus(v: unknown): Status {
  if (typeof v !== "string" || !STATUSES.includes(v as Status)) {
    throw new ValidationError(`status deve ser um de: ${STATUSES.join(", ")}`);
  }
  return v as Status;
}

export function parseBookInput(v: unknown): BookInput {
  if (!v || typeof v !== "object") throw new ValidationError("book obrigatório");
  const b = v as Record<string, unknown>;
  const source = BOOK_SOURCES.includes(b.source as BookSource) ? (b.source as BookSource) : null;
  if (!source) throw new ValidationError(`book.source deve ser um de: ${BOOK_SOURCES.join(", ")}`);
  const title = optStr(b.title, "book.title", 500);
  if (!title) throw new ValidationError("book.title obrigatório");
  const authorsRaw = Array.isArray(b.authors) ? b.authors : [];
  const authors = authorsRaw.filter((a): a is string => typeof a === "string").map((a) => a.trim()).filter(Boolean).slice(0, 10);
  const sourceId = optStr(b.sourceId, "book.sourceId", 200);
  if (source !== "manual" && !sourceId) throw new ValidationError("book.sourceId obrigatório para livros de fontes externas");
  const coverRef = optStr(b.coverRef, "book.coverRef", 40);
  if (coverRef && !/^(g|ol:\d{1,12})$/.test(coverRef)) throw new ValidationError("book.coverRef inválido");
  const isbn = optStr(b.isbn13, "book.isbn13", 20)?.replace(/[^0-9Xx]/g, "") || null;
  if (isbn && isbn.length !== 10 && isbn.length !== 13) throw new ValidationError("ISBN deve ter 10 ou 13 dígitos");
  return {
    source,
    sourceId: source === "manual" ? null : sourceId,
    title,
    authors,
    pageCount: optInt(b.pageCount, "book.pageCount", 1, 100000),
    publishedYear: optInt(b.publishedYear, "book.publishedYear", 0, 3000),
    isbn13: isbn,
    coverRef: source === "manual" ? null : coverRef,
  };
}
