import { Hono } from "hono";
import { APP_NAME, CONTACT_EMAIL } from "../contact.js";
import { env } from "../env.js";
import type { AppEnv, BookDetails, BookInput, ErrorCode } from "../types.js";

/**
 * Busca de livros em repositórios públicos. Nada disso é persistido além do que o
 * usuário adiciona à estante (e mesmo aí só título/autores/ids curtos).
 *   1. Google Books (principal)
 *   2. Open Library (fallback quando o Google falha ou limita)
 */
const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_URL = "https://openlibrary.org";
const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = `${APP_NAME}/0.1 (book tracker; contact: ${CONTACT_EMAIL})`;

// ---------- cache simples em memória (LRU-ish por tamanho) ----------
function makeCache<T>(max: number, ttlMs: number) {
  const map = new Map<string, { at: number; value: T }>();
  return {
    get(key: string): T | undefined {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (Date.now() - hit.at > ttlMs) { map.delete(key); return undefined; }
      return hit.value;
    },
    set(key: string, value: T) {
      if (map.size >= max) map.delete(map.keys().next().value as string);
      map.set(key, { at: Date.now(), value });
    },
  };
}
const searchCache = makeCache<BookInput[]>(500, 10 * 60 * 1000);
const detailsCache = makeCache<BookDetails>(1000, 60 * 60 * 1000);

// ---------- throttle por usuário (protege o backend e as cotas externas) ----------
const BUCKET_CAPACITY = 5;        // rajada máxima
const BUCKET_REFILL_PER_SEC = 1;  // 1 busca/segundo em regime
const buckets = new Map<string, { tokens: number; at: number }>();
export function allowSearch(userId: string, now = Date.now()): boolean {
  const b = buckets.get(userId) ?? { tokens: BUCKET_CAPACITY, at: now };
  b.tokens = Math.min(BUCKET_CAPACITY, b.tokens + ((now - b.at) / 1000) * BUCKET_REFILL_PER_SEC);
  b.at = now;
  if (b.tokens < 1) { buckets.set(userId, b); return false; }
  b.tokens -= 1;
  buckets.set(userId, b);
  if (buckets.size > 10000) buckets.clear();
  return true;
}

function fetchJson(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "User-Agent": USER_AGENT } });
}

// ---------- Google Books ----------
interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

export function normalizeVolume(v: GoogleVolume): BookInput | null {
  const info = v.volumeInfo;
  if (!info?.title) return null;
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : NaN;
  return {
    source: "google",
    sourceId: v.id,
    title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
    authors: info.authors ?? [],
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : null,
    publishedYear: Number.isFinite(year) && year > 0 ? year : null,
    isbn13: info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? null,
    coverRef: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail ? "g" : null,
  };
}

async function searchGoogle(q: string): Promise<BookInput[]> {
  const params = new URLSearchParams({ q, maxResults: "12", printType: "books", fields: "items(id,volumeInfo(title,subtitle,authors,publishedDate,pageCount,industryIdentifiers,imageLinks(thumbnail,smallThumbnail)))" });
  if (env.google.booksApiKey) params.set("key", env.google.booksApiKey);
  const res = await fetchJson(`${GOOGLE_BOOKS_URL}?${params}`);
  if (!res.ok) throw Object.assign(new Error(`Google Books ${res.status}`), { status: res.status });
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(normalizeVolume).filter((b): b is BookInput => b !== null);
}

// ---------- Open Library ----------
interface OpenLibraryDoc {
  key: string; // "/works/OL123W"
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
}

export function normalizeOpenLibraryDoc(d: OpenLibraryDoc): BookInput | null {
  if (!d.title || !d.key) return null;
  return {
    source: "openlibrary",
    sourceId: d.key.replace(/^\/works\//, ""),
    title: d.title,
    authors: d.author_name ?? [],
    pageCount: d.number_of_pages_median && d.number_of_pages_median > 0 ? d.number_of_pages_median : null,
    publishedYear: d.first_publish_year && d.first_publish_year > 0 ? d.first_publish_year : null,
    isbn13: d.isbn?.find((i) => i.length === 13) ?? null,
    coverRef: d.cover_i ? `ol:${d.cover_i}` : null,
  };
}

async function searchOpenLibrary(q: string): Promise<BookInput[]> {
  const params = new URLSearchParams({ q, limit: "12", fields: "key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i" });
  const res = await fetchJson(`${OPEN_LIBRARY_SEARCH_URL}?${params}`);
  if (!res.ok) throw Object.assign(new Error(`Open Library ${res.status}`), { status: res.status });
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map(normalizeOpenLibraryDoc).filter((b): b is BookInput => b !== null);
}

// ---------- orquestração ----------
export async function searchBooks(q: string): Promise<{ items: BookInput[]; provider: "google" | "openlibrary" }> {
  const key = q.toLowerCase();
  const hit = searchCache.get(key);
  if (hit) return { items: hit, provider: hit[0]?.source === "openlibrary" ? "openlibrary" : "google" };
  let items: BookInput[];
  let provider: "google" | "openlibrary" = "google";
  try {
    items = await searchGoogle(q);
  } catch (googleErr) {
    try {
      items = await searchOpenLibrary(q);
      provider = "openlibrary";
    } catch {
      const status = (googleErr as { status?: number }).status;
      throw Object.assign(
        new Error(status === 429
          ? "Busca temporariamente indisponível (limite das fontes externas). Tente de novo em instantes ou cadastre o livro manualmente."
          : "Não foi possível consultar as fontes de livros agora."),
        { status: 503, code: (status === 429 ? "SEARCH_SOURCES_LIMITED" : "SEARCH_UNAVAILABLE") satisfies ErrorCode },
      );
    }
  }
  searchCache.set(key, items);
  return { items, provider };
}

/** Sinopse na fonte externa; quem grava no banco é `GET /api/shelf/:id/details`. */
export async function fetchDetails(source: string, sourceId: string): Promise<BookDetails> {
  const key = `${source}:${sourceId}`;
  const hit = detailsCache.get(key);
  if (hit) return hit;
  let details: BookDetails = { description: null };
  try {
    if (source === "google") {
      const params = new URLSearchParams({ fields: "volumeInfo/description" });
      if (env.google.booksApiKey) params.set("key", env.google.booksApiKey);
      const res = await fetchJson(`${GOOGLE_BOOKS_URL}/${encodeURIComponent(sourceId)}?${params}`);
      if (res.ok) {
        const v = (await res.json()) as GoogleVolume;
        details = { description: v.volumeInfo?.description?.replace(/<[^>]+>/g, "").slice(0, 5000) ?? null };
      }
    } else if (source === "openlibrary") {
      const res = await fetchJson(`${OPEN_LIBRARY_URL}/works/${encodeURIComponent(sourceId)}.json`);
      if (res.ok) {
        const w = (await res.json()) as { description?: string | { value?: string } };
        const d = typeof w.description === "string" ? w.description : w.description?.value;
        details = { description: d ? d.slice(0, 5000) : null };
      }
    }
  } catch {
    // sem rede/limite: segue sem sinopse
  }
  if (details.description !== null) detailsCache.set(key, details);
  return details;
}

export function searchRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/api/search", async (c) => {
    const q = (c.req.query("q") ?? "").trim().replace(/\s+/g, " ");
    if (q.length < 3) return c.json({ items: [], provider: null });
    if (!allowSearch(c.var.user.id)) return c.json({ error: "Muitas buscas em sequência. Aguarde um instante.", code: "SEARCH_RATE_LIMITED" }, 429);
    try {
      const { items, provider } = await searchBooks(q.slice(0, 120));
      c.header("Cache-Control", "private, max-age=300");
      return c.json({ items, provider });
    } catch (e) {
      const err = e as Error & { status?: number; code?: ErrorCode };
      return c.json({ error: err.message, code: err.code ?? "SEARCH_UNAVAILABLE" }, (err.status ?? 502) as 502 | 503);
    }
  });

  return app;
}
