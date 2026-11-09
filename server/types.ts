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
  /** Página em que o leitor está (Lendo) ou parou (Abandonado); null em Quero ler e Lido. */
  currentPage: number | null;
  createdAt: string;
  updatedAt: string;
  book: Book;
}

/** O que um amigo vê de outro usuário: nunca o e-mail. */
export interface FriendUser {
  id: string;
  name: string | null;
  picture: string | null;
}

/** Livro na estante de um amigo: só lendo/lido, sem nota, resenha, datas ou sinopse. */
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

export interface FriendSummary extends FriendUser {
  reading: FriendBook[];
}

export type CommentVisibility = "private" | "public";
export const COMMENT_VISIBILITIES: CommentVisibility[] = ["private", "public"];

/** Comentário como amigos o veem: sem a visibilidade (só públicos saem para eles). */
export interface PublicComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Meu comentário, com a visibilidade escolhida. */
export interface BookComment extends PublicComment {
  visibility: CommentVisibility;
}

/** Comentário público de um amigo sobre o mesmo livro. */
export interface FriendComment extends PublicComment {
  author: FriendUser;
}

export interface FriendInvitePreview {
  inviter: FriendUser;
  alreadyFriends: boolean;
}

export type AppEnv = {
  Variables: { user: User; sessionId: string; adUnlocked: boolean };
};

/** Códigos estáveis de erro da API: o cliente traduz por eles; o campo `error` segue em português. */
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
