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

export interface BookInput {
  source: "google" | "manual";
  sourceId?: string | null;
  title: string;
  authors?: string[];
  coverUrl?: string | null;
  pageCount?: number | null;
  publishedYear?: number | null;
  isbn13?: string | null;
  description?: string | null;
}

export interface Book extends BookInput {
  id: string;
  authors: string[];
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
