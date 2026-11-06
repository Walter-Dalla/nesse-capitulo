export type Status = "want" | "reading" | "read" | "abandoned";
export const STATUSES: Status[] = ["want", "reading", "read", "abandoned"];

export interface User {
  id: string;
  google_sub: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export type BookSource = "google" | "openlibrary" | "manual";
export const BOOK_SOURCES: BookSource[] = ["google", "openlibrary", "manual"];

/** Metadados mínimos de um livro. Capa e sinopse não vêm do cliente: saem da fonte externa. */
export interface BookInput {
  source: BookSource;
  sourceId?: string | null;
  title: string;
  authors?: string[];
  pageCount?: number | null;
  publishedYear?: number | null;
  isbn13?: string | null;
  /** 'g' (capa no Google Books via sourceId) | 'ol:<cover_id>' (Open Library) | null (derivar do ISBN) */
  coverRef?: string | null;
}

export interface Book {
  id: string;
  source: BookSource;
  sourceId: string | null;
  title: string;
  authors: string[];
  pageCount: number | null;
  publishedYear: number | null;
  isbn13: string | null;
  coverRef: string | null;
}

/** Dados buscados sob demanda (não persistidos). */
export interface BookDetails {
  description: string | null;
}

export interface ShelfItem {
  id: string;
  status: Status;
  rating: number | null;
  review: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  readYear: number | null;
  createdAt: string;
  updatedAt: string;
  book: Book;
}

export type AppEnv = {
  Variables: { user: User; sessionId: string; adUnlocked: boolean };
};
