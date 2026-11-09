import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Api, invalidateShelf, queryClient } from "./api";
import { clearBookCaches, forgetDetails, loadDetails, preloadCovers } from "./bookCache";
import { clearDrafts } from "./itemDraft";
import { browserInviteStore, clearPendingInvite } from "./pendingInvite";
import type { AddPayload, BookComment, CommentVisibility, ModerationAction, ReportInput, ShelfItem, ShelfPatch, Status } from "./types";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: Api.me, staleTime: 5 * 60_000 });
export const useProviders = () => useQuery({ queryKey: ["providers"], queryFn: Api.providers, staleTime: Infinity });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: Api.stats });
export const useShelf = (params: { status?: Status; year?: number } = {}) =>
  useQuery({ queryKey: ["shelf", params], queryFn: () => Api.shelf(params) });
export const useItem = (id: string) => useQuery({ queryKey: ["item", id], queryFn: () => Api.item(id) });

// ---------- amigos ----------
// Tudo sob o prefixo ["friends"]: mudar uma amizade invalida o prefixo inteiro.
// O badge não usa o prefixo ["item"]: invalidateShelf refaria a chamada e daria 404 durante a remoção do item.

export const useFriends = () => useQuery({ queryKey: ["friends"], queryFn: Api.friends });
export const useFriendShelf = (id: string) =>
  useQuery({ queryKey: ["friends", "detail", id], queryFn: () => Api.friendShelf(id), retry: false });
export const useBookFriends = (itemId: string, enabled: boolean) =>
  useQuery({ queryKey: ["friends", "book", itemId], queryFn: () => Api.bookFriends(itemId), enabled, retry: false });
export const useFriendBadges = () => useQuery({ queryKey: ["friends", "badges"], queryFn: Api.friendBadges, retry: false });
export const useInvite = (code: string) =>
  useQuery({ queryKey: ["friends", "invite", code], queryFn: () => Api.invite(code), retry: false });

export const useCreateInvite = () => useMutation({ mutationFn: Api.createInvite });

export const useAcceptInvite = () =>
  useMutation({
    mutationFn: (code: string) => Api.acceptInvite(code),
    // comentários públicos do novo amigo passam a aparecer nos meus livros
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["friends"] }),
      queryClient.invalidateQueries({ queryKey: ["comments"] }),
    ]),
  });

export const useRemoveFriend = () =>
  useMutation({
    mutationFn: (userId: string) => Api.removeFriend(userId),
    onSuccess: (_data, userId) =>
      Promise.all([
        // a tela do ex-amigo daria 404 se fosse refeita agora; só fica vencida para a próxima visita
        queryClient.invalidateQueries({ queryKey: ["friends", "detail", userId], refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: ["friends"], predicate: (q) => !(q.queryKey[1] === "detail" && q.queryKey[2] === userId) }),
        queryClient.invalidateQueries({ queryKey: ["comments"] }),
      ]),
  });

// ---------- denúncia e bloqueio ----------

export const useBlocks = () => useQuery({ queryKey: ["friends", "blocks"], queryFn: Api.blocks });

/** O alvo denunciado some para quem denunciou: comentários e estante do amigo são refeitos. */
export const useReport = () =>
  useMutation({
    mutationFn: (input: ReportInput) => Api.report(input),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["comments"] }),
      queryClient.invalidateQueries({ queryKey: ["friends"] }),
    ]),
  });

/** Bloquear desfaz a amizade: mesmo cuidado de useRemoveFriend com a tela do ex-amigo. */
export const useBlock = () =>
  useMutation({
    mutationFn: (userId: string) => Api.blockFriend(userId),
    onSuccess: (_data, userId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends", "detail", userId], refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: ["friends"], predicate: (q) => !(q.queryKey[1] === "detail" && q.queryKey[2] === userId) }),
        queryClient.invalidateQueries({ queryKey: ["comments"] }),
      ]),
  });

/** Desbloquear não refaz a amizade; só a lista de bloqueados muda. */
export const useUnblock = () =>
  useMutation({
    mutationFn: (userId: string) => Api.unblock(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["friends"] }),
  });

// ---------- moderação ----------
// Só para moderador: os outros recebem 404, então a consulta nem sai sem isModerator.

export const useModReports = (enabled: boolean) =>
  useQuery({ queryKey: ["mod", "reports"], queryFn: () => Api.modReports(), enabled, retry: false });

export const useResolveReport = () =>
  useMutation({
    mutationFn: ({ id, action }: { id: string; action: ModerationAction }) => Api.resolveReport(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mod"] }),
  });

// ---------- comentários ----------
// Chave própria (["comments", itemId]): fora de invalidateShelf, que a refaria com 404 durante a remoção do item.

export const useComments = (itemId: string) => useQuery({ queryKey: ["comments", itemId], queryFn: () => Api.comments(itemId) });

/** Troca um comentário meu no cache, sem refazer a lista inteira. */
function patchCachedComment(itemId: string, fn: (list: BookComment[]) => BookComment[]) {
  queryClient.setQueryData<{ comments: BookComment[]; friends: unknown[] }>(["comments", itemId], (old) => (old ? { ...old, comments: fn(old.comments) } : old));
}

export const useAddComment = (itemId: string) =>
  useMutation({
    mutationFn: (input: { body: string; visibility: CommentVisibility }) => Api.addComment(itemId, input),
    onSuccess: ({ comment }) => patchCachedComment(itemId, (list) => [comment, ...list]),
  });

export const useUpdateComment = (itemId: string) =>
  useMutation({
    mutationFn: ({ id, ...patch }: { id: string; body?: string; visibility?: CommentVisibility }) => Api.updateComment(id, patch),
    onSuccess: ({ comment }) => patchCachedComment(itemId, (list) => list.map((c) => (c.id === comment.id ? comment : c))),
  });

export const useRemoveComment = (itemId: string) =>
  useMutation({
    mutationFn: (id: string) => Api.removeComment(id),
    onSuccess: (_data, id) => patchCachedComment(itemId, (list) => list.filter((c) => c.id !== id)),
  });

/** Espera de 1 s depois da última tecla antes de consultar o backend. */
export const SEARCH_DEBOUNCE_MS = 1000;
export const SEARCH_MIN_CHARS = 3;

export function useSearch(q: string) {
  const normalized = q.trim().replace(/\s+/g, " ");
  const [debounced, flush] = useDebounced(normalized, SEARCH_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ["search", debounced.toLowerCase()],
    queryFn: () => Api.search(debounced),
    enabled: debounced.length >= SEARCH_MIN_CHARS,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
  return { ...query, debounced, flush, waiting: normalized.length >= SEARCH_MIN_CHARS && normalized !== debounced };
}

const DETAILS_STALE_MS = 60 * 60_000;

export const useDetails = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ["details", id], queryFn: () => loadDetails(id), enabled, staleTime: DETAILS_STALE_MS, retry: false });

/** Depois de salvar: deixa capa e sinopse prontas no navegador, sem segurar a resposta da ação. */
function cacheBookAssets(item: ShelfItem) {
  preloadCovers(item.book);
  if (item.book.source === "manual") return;
  void queryClient.prefetchQuery({ queryKey: ["details", item.id], queryFn: () => loadDetails(item.id), staleTime: DETAILS_STALE_MS });
}

/** Refaz ["me"]: com termsAccepted verdadeiro, RequireAuth troca o TermsGate pela rota pedida. */
export const useAcceptTerms = () =>
  useMutation({ mutationFn: Api.acceptTerms, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }) });

export const useAdReward = () =>
  useMutation({ mutationFn: (provider: string) => Api.adReward(provider), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }) });

export const useAddToShelf = () =>
  useMutation({
    mutationFn: (p: AddPayload) => Api.add(p),
    onSuccess: (data) => {
      cacheBookAssets(data.item);
      return invalidateShelf();
    },
  });

function onItemUpdated(id: string, data: { item: ShelfItem }) {
  queryClient.setQueryData(["item", id], data);
  cacheBookAssets(data.item);
  // o item continua existindo: pode refazer quem dos amigos já leu (ISBN de livro manual pode ter mudado)
  void queryClient.invalidateQueries({ queryKey: ["friends", "book", id] });
  void queryClient.invalidateQueries({ queryKey: ["comments", id] });
  return invalidateShelf();
}

export const useUpdateItem = (id: string) =>
  useMutation({
    mutationFn: (patch: ShelfPatch) => Api.update(id, patch),
    onSuccess: (data) => onItemUpdated(id, data),
  });

/** Mesma atualização, para quem só conhece o id na hora de salvar (AddSheet, que acabou de criar o item). */
export const useUpdateAnyItem = () =>
  useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ShelfPatch }) => Api.update(id, patch),
    onSuccess: (data, { id }) => onItemUpdated(id, data),
  });

export const useRemoveItem = () =>
  useMutation({
    mutationFn: (id: string) => Api.remove(id),
    onSuccess: (_data, id) => {
      void forgetDetails(id);
      return invalidateShelf();
    },
  });

/** Tira do aparelho tudo da conta que saiu (logout ou exclusão). */
function clearLocalAccount() {
  // primeiro derruba o usuário (RequireAuth redireciona), depois limpa o resto sem refetch
  queryClient.setQueryData(["me"], { user: null, adUnlocked: false });
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  void clearBookCaches();
  clearDrafts();
  clearPendingInvite(browserInviteStore());
}

export const useLogout = () => useMutation({ mutationFn: Api.logout, onSuccess: clearLocalAccount });

/** Erro não limpa nada: a conta continua existindo. */
export const useDeleteAccount = () => useMutation({ mutationFn: Api.deleteAccount, onSuccess: clearLocalAccount });

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  // flush aplica o valor atual sem esperar o prazo
  return [v, () => setV(value)] as const;
}
