import { t } from "./i18n.js";

export type Status = "want" | "reading" | "read" | "abandoned";

export const STATUS_LABEL: Record<Status, string> = {
  get reading() { return t("base.status.label.reading"); },
  get want() { return t("base.status.label.want"); },
  get read() { return t("base.status.label.read"); },
  get abandoned() { return t("base.status.label.abandoned"); },
};

export const STATUS_ACTION: Record<Status, string> = {
  get reading() { return t("base.status.action.reading"); },
  get want() { return t("base.status.action.want"); },
  get read() { return t("base.status.action.read"); },
  get abandoned() { return t("base.status.action.abandoned"); },
};

/** Selo no cartão, no singular e com o mesmo vocabulário dos filtros. */
export const STATUS_BADGE: Record<Status, string> = {
  get reading() { return t("base.status.badge.reading"); },
  get want() { return t("base.status.badge.want"); },
  get read() { return t("base.status.badge.read"); },
  get abandoned() { return t("base.status.badge.abandoned"); },
};

/** Cabeçalho de cada grupo em "Ver todos"; Lendo sempre primeiro (ordem de STATUS_ORDER). */
export const STATUS_GROUP: Record<Status, string> = {
  get reading() { return t("base.status.group.reading"); },
  get want() { return t("base.status.group.want"); },
  get read() { return t("base.status.group.read"); },
  get abandoned() { return t("base.status.group.abandoned"); },
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
  get manual() { return t("base.source.manual"); },
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
  /** Página em que estou (Lendo) ou parei (Abandonado); null em Quero ler e Lido. */
  currentPage: number | null;
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
  currentPage?: number | null;
  book?: Partial<BookInput>;
}

export interface AddPayload extends Omit<ShelfPatch, "book"> {
  book: BookInput;
}

/** O que se vê de um amigo: nunca o e-mail. */
export interface FriendUser {
  id: string;
  name: string | null;
  picture: string | null;
}

/** Livro na estante de um amigo: só lendo/lido, sem nota, resenha ou datas. */
export interface FriendBook {
  status: "reading" | "read";
  readYear: number | null;
  /** Progresso de quem está lendo; null em Lido. */
  currentPage: number | null;
  book: Book;
}

/** Livro na tela de um amigo, com os comentários que ele deixou públicos. */
export interface FriendShelfItem extends FriendBook {
  comments: PublicComment[];
}

export type CommentVisibility = "private" | "public";

export const VISIBILITY_LABEL: Record<CommentVisibility, string> = {
  get private() { return t("base.visibility.private"); },
  get public() { return t("base.visibility.public"); },
};

/** Comentário como amigos o veem (só os públicos saem para eles). */
export interface PublicComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookComment extends PublicComment {
  visibility: CommentVisibility;
}

/** Comentário público de um amigo sobre o mesmo livro. */
export interface FriendComment extends PublicComment {
  author: FriendUser;
}

export interface FriendSummary extends FriendUser {
  reading: FriendBook[];
}

export interface FriendInvitePreview {
  inviter: FriendUser;
  alreadyFriends: boolean;
}

/** Espelho de `ERROR_CODES` de server/types.ts. */
export const ERROR_CODES = [
  "NOT_FOUND",
  "INTERNAL",
  "INVITE_INVALID",
  "INVITE_SELF",
  "AD_REQUIRED",
  "AD_PROVIDER_INVALID",
  "AD_NOT_COMPLETED",
  "SEARCH_RATE_LIMITED",
  "SEARCH_SOURCES_LIMITED",
  "SEARCH_UNAVAILABLE",
  "DATE_RANGE_INVALID",
  "ISBN_INVALID",
  "COMMENT_EMPTY",
  "VALIDATION",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
