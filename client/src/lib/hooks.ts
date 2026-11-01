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

export function useSearch(q: string) {
  const debounced = useDebounced(q.trim(), 400);
  return {
    ...useQuery({
      queryKey: ["search", debounced],
      queryFn: () => Api.search(debounced),
      enabled: debounced.length >= 2,
      staleTime: 10 * 60_000,
      retry: false,
    }),
    debounced,
  };
}

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
      queryClient.clear();
      queryClient.setQueryData(["me"], { user: null });
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
