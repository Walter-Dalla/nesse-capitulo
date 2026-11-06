export type Status = "want" | "reading" | "read" | "abandoned";

export const STATUS_LABEL: Record<Status, string> = {
  reading: "Lendo",
  want: "Quero ler",
  read: "Lidos",
  abandoned: "Abandonados",
};

export const STATUS_ACTION: Record<Status, string> = {
  reading: "Estou lendo",
  want: "Quero ler",
  read: "Já li",
  abandoned: "Abandonei",
};

export const STATUS_ORDER: Status[] = ["reading", "want", "read", "abandoned"];

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export type BookSource = "google" | "openlibrary" | "manual";

/** Metadados mínimos; capa vem da fonte externa e sinopse do servidor (ver coverUrlFor / useDetails). */
export interface BookInput {
  source: BookSource;
  sourceId?: string | null;
  title: string;
  authors?: string[];
  pageCount?: number | null;
  publishedYear?: number | null;
  isbn13?: string | null;
  /** 'g' = capa do Google Books via sourceId; 'ol:<id>' = Open Library; null = tentar pelo ISBN */
  coverRef?: string | null;
}

export interface Book extends BookInput {
  id: string;
  authors: string[];
}

export const SOURCE_LABEL: Record<BookSource, string> = {
  google: "Google Books",
  openlibrary: "Open Library",
  manual: "cadastrado manualmente",
};

export interface Providers {
  google: boolean;
  dev: boolean;
  ads: { enabled: boolean; provider: "simulated" | "adsense"; adsenseClient: string | null };
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

export interface YearStats {
  year: number;
  books: number;
  pages: number;
  avgRating: number | null;
}

export interface Stats {
  years: YearStats[];
  counts: Record<Status, number>;
}

export interface ShelfPatch {
  status?: Status;
  rating?: number | null;
  review?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  readYear?: number | null;
  book?: Partial<BookInput>;
}

export interface AddPayload extends Omit<ShelfPatch, "book"> {
  book: BookInput;
}
