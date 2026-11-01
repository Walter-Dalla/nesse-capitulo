import { STATUSES, type BookInput, type Status } from "./types.js";

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
  const source = b.source === "google" ? "google" : b.source === "manual" ? "manual" : null;
  if (!source) throw new ValidationError("book.source deve ser 'google' ou 'manual'");
  const title = optStr(b.title, "book.title", 500);
  if (!title) throw new ValidationError("book.title obrigatório");
  const authorsRaw = Array.isArray(b.authors) ? b.authors : [];
  const authors = authorsRaw.filter((a): a is string => typeof a === "string").map((a) => a.trim()).filter(Boolean).slice(0, 10);
  const sourceId = optStr(b.sourceId, "book.sourceId", 200);
  if (source === "google" && !sourceId) throw new ValidationError("book.sourceId obrigatório para livros do Google");
  return {
    source,
    sourceId: source === "google" ? sourceId : null,
    title,
    authors,
    coverUrl: optStr(b.coverUrl, "book.coverUrl", 1000),
    pageCount: optInt(b.pageCount, "book.pageCount", 1, 100000),
    publishedYear: optInt(b.publishedYear, "book.publishedYear", 0, 3000),
    isbn13: optStr(b.isbn13, "book.isbn13", 20),
    description: optStr(b.description, "book.description", 5000),
  };
}
