import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Api, invalidateShelf, queryClient } from "./api";
import type { AddPayload, ShelfPatch, Status } from "./types";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: Api.me, staleTime: 5 * 60_000 });
export const useProviders = () => useQuery({ queryKey: ["providers"], queryFn: Api.providers, staleTime: Infinity });
export const useStats = () => useQuery({ queryKey: ["stats"], queryFn: Api.stats });
export const useShelf = (params: { status?: Status; year?: number } = {}) =>
  useQuery({ queryKey: ["shelf", params], queryFn: () => Api.shelf(params) });
export const useItem = (id: string) => useQuery({ queryKey: ["item", id], queryFn: () => Api.item(id) });

/** Espera de 1 s depois da última tecla antes de consultar o backend. */
export const SEARCH_DEBOUNCE_MS = 1000;
export const SEARCH_MIN_CHARS = 3;

export function useSearch(q: string) {
  const normalized = q.trim().replace(/\s+/g, " ");
  const debounced = useDebounced(normalized, SEARCH_DEBOUNCE_MS);
  const query = useQuery({
    queryKey: ["search", debounced.toLowerCase()],
    queryFn: () => Api.search(debounced),
    enabled: debounced.length >= SEARCH_MIN_CHARS,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
  return { ...query, debounced, waiting: normalized.length >= SEARCH_MIN_CHARS && normalized !== debounced };
}

export const useDetails = (id: string, enabled: boolean) =>
  useQuery({ queryKey: ["details", id], queryFn: () => Api.details(id), enabled, staleTime: 60 * 60_000, retry: false });

export const useAdReward = () =>
  useMutation({ mutationFn: (provider: string) => Api.adReward(provider), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }) });

export const useAddToShelf = () =>
  useMutation({ mutationFn: (p: AddPayload) => Api.add(p), onSuccess: () => invalidateShelf() });

export const useUpdateItem = (id: string) =>
  useMutation({
    mutationFn: (patch: ShelfPatch) => Api.update(id, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(["item", id], data);
      return invalidateShelf();
    },
  });

export const useRemoveItem = () =>
  useMutation({ mutationFn: (id: string) => Api.remove(id), onSuccess: () => invalidateShelf() });

export const useLogout = () =>
  useMutation({
    mutationFn: Api.logout,
    onSuccess: () => {
      // primeiro derruba o usuário (RequireAuth redireciona), depois limpa o resto sem refetch
      queryClient.setQueryData(["me"], { user: null, adUnlocked: false });
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    },
  });

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
