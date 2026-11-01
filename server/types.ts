export type Status = "want" | "reading" | "read" | "abandoned";
export const STATUSES: Status[] = ["want", "reading", "read", "abandoned"];

export interface User {
  id: string;
  google_sub: string | null;
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

export interface Book {
  id: string;
  source: "google" | "manual";
  sourceId: string | null;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  isbn13: string | null;
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
  Variables: { user: User };
};
