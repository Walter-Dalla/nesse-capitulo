import { QueryClient } from "@tanstack/react-query";
import { apiErrorMessage } from "./i18n.js";
import type {
  AddPayload, BookComment, BookInput, CommentVisibility, FriendComment, FriendInvitePreview, FriendShelfItem, FriendSummary, FriendUser,
  Providers, ShelfItem, ShelfPatch, Stats, Status, User,
} from "./types";
import type { ReportInput } from "./types";
import type { ModerationAction, ModReport, ReportStatus } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (res.status === 401) {
    queryClient.setQueryData(["me"], { user: null });
    throw new ApiError(401, apiErrorMessage(undefined, 401));
  }
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, apiErrorMessage(data?.code, res.status), data?.code);
  return data as T;
}

export const Api = {
  me: () => api<{ user: User | null; adUnlocked: boolean; termsAccepted: boolean }>("/api/me"),
  providers: () => api<Providers>("/auth/providers"),
  adReward: (provider: string) => api<{ unlocked: boolean }>("/api/ads/reward", { method: "POST", body: JSON.stringify({ provider, outcome: "viewed" }) }),
  devLogin: (name: string, email: string) => api<{ user: User }>("/auth/dev", { method: "POST", body: JSON.stringify({ name, email }) }),
  logout: () => api<{ ok: true }>("/auth/logout", { method: "POST" }),

  search: (q: string) => api<{ items: BookInput[]; provider: "google" | "openlibrary" | null }>(`/api/search?q=${encodeURIComponent(q)}`),
  details: (id: string) => api<{ description: string | null }>(`/api/shelf/${id}/details`),

  shelf: (params: { status?: Status; year?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.year) qs.set("year", String(params.year));
    const s = qs.toString();
    return api<{ items: ShelfItem[] }>(`/api/shelf${s ? `?${s}` : ""}`);
  },
  item: (id: string) => api<{ item: ShelfItem }>(`/api/shelf/${id}`),
  add: (payload: AddPayload) => api<{ item: ShelfItem }>("/api/shelf", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, patch: ShelfPatch) => api<{ item: ShelfItem }>(`/api/shelf/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => api<{ ok: true }>(`/api/shelf/${id}`, { method: "DELETE" }),

  stats: () => api<Stats>("/api/stats"),

  createInvite: () => api<{ code: string }>("/api/friends/invites", { method: "POST" }),
  invite: (code: string) => api<FriendInvitePreview>(`/api/friends/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string) => api<{ friend: FriendUser }>(`/api/friends/invites/${encodeURIComponent(code)}/accept`, { method: "POST" }),
  friends: () => api<{ friends: FriendSummary[] }>("/api/friends"),
  friendShelf: (userId: string) => api<{ friend: FriendUser; items: FriendShelfItem[] }>(`/api/friends/${encodeURIComponent(userId)}/shelf`),
  removeFriend: (userId: string) => api<{ ok: true }>(`/api/friends/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  bookFriends: (itemId: string) => api<{ friends: FriendUser[] }>(`/api/shelf/${encodeURIComponent(itemId)}/friends`),
  friendBadges: () => api<{ badges: Record<string, number> }>("/api/friends/badges"),

  comments: (itemId: string) => api<{ comments: BookComment[]; friends: FriendComment[] }>(`/api/shelf/${encodeURIComponent(itemId)}/comments`),
  addComment: (itemId: string, input: { body: string; visibility: CommentVisibility }) =>
    api<{ comment: BookComment }>(`/api/shelf/${encodeURIComponent(itemId)}/comments`, { method: "POST", body: JSON.stringify(input) }),
  updateComment: (id: string, patch: { body?: string; visibility?: CommentVisibility }) =>
    api<{ comment: BookComment }>(`/api/comments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeComment: (id: string) => api<{ ok: true }>(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE" }),

  deleteAccount: () => api<{ ok: true }>("/api/account", { method: "DELETE" }),
  acceptTerms: () => api<{ ok: true }>("/api/terms/accept", { method: "POST" }),

  blockFriend: (userId: string) => api<{ ok: true }>(`/api/friends/${encodeURIComponent(userId)}/block`, { method: "POST" }),
  blocks: () => api<{ blocks: FriendUser[] }>("/api/friends/blocks"),
  unblock: (userId: string) => api<{ ok: true }>(`/api/friends/blocks/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  report: (input: ReportInput) => api<{ ok: true }>("/api/reports", { method: "POST", body: JSON.stringify(input) }),
  modReports: (status: ReportStatus = "open") => api<{ reports: ModReport[] }>(`/api/mod/reports?status=${status}`),
  resolveReport: (id: string, action: ModerationAction) =>
    api<{ ok: true }>(`/api/mod/reports/${encodeURIComponent(id)}/resolve`, { method: "POST", body: JSON.stringify({ action }) }),
};

/** Invalida tudo que depende da estante após uma mutação. */
export function invalidateShelf() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["shelf"] }),
    queryClient.invalidateQueries({ queryKey: ["item"] }),
    queryClient.invalidateQueries({ queryKey: ["stats"] }),
    // contagem de amigos por item; ["friends","book",id] fica de fora: daria 404 durante a remoção do item
    queryClient.invalidateQueries({ queryKey: ["friends", "badges"] }),
  ]);
}

/** O texto de um ApiError é montado ao lançar e fica no cache, que sobrevive à troca de idioma: consulta com erro busca de novo. */
export function resetErroredQueries() {
  void queryClient.resetQueries({ predicate: (query) => query.state.status === "error" });
}
