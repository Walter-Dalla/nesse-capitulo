import { Hono } from "hono";
import { env } from "../env.js";
import type { AppEnv, BookInput } from "../types.js";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; items: BookInput[] }>();

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
  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  const year = info.publishedDate ? Number(info.publishedDate.slice(0, 4)) : NaN;
  return {
    source: "google",
    sourceId: v.id,
    title: info.subtitle ? `${info.title}: ${info.subtitle}` : info.title,
    authors: info.authors ?? [],
    coverUrl: thumb ? thumb.replace(/^http:/, "https:").replace(/&edge=curl/, "") : null,
    pageCount: info.pageCount && info.pageCount > 0 ? info.pageCount : null,
    publishedYear: Number.isFinite(year) && year > 0 ? year : null,
    isbn13: info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier ?? null,
    description: info.description ? info.description.slice(0, 5000) : null,
  };
}

export async function searchGoogleBooks(q: string): Promise<BookInput[]> {
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.items;

  const params = new URLSearchParams({ q, maxResults: "20", printType: "books" });
  if (env.google.booksApiKey) params.set("key", env.google.booksApiKey);
  const res = await fetch(`${GOOGLE_BOOKS_URL}?${params}`);
  if (res.status === 429) throw Object.assign(new Error("Busca temporariamente indisponível (limite da Google Books API). Tente de novo em instantes ou adicione o livro manualmente."), { status: 503 });
  if (!res.ok) throw Object.assign(new Error("Falha ao consultar a Google Books API"), { status: 502 });
  const data = (await res.json()) as { items?: GoogleVolume[] };
  const items = (data.items ?? []).map(normalizeVolume).filter((b): b is BookInput => b !== null);
  cache.set(key, { at: Date.now(), items });
  return items;
}

export function searchRoutes() {
  const app = new Hono<AppEnv>();
  app.get("/api/search", async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    if (q.length < 2) return c.json({ items: [] });
    try {
      return c.json({ items: await searchGoogleBooks(q.slice(0, 200)) });
    } catch (e) {
      const err = e as Error & { status?: number };
      return c.json({ error: err.message }, (err.status ?? 502) as 502 | 503);
    }
  });
  return app;
}
