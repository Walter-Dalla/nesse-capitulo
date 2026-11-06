import { Api } from "./api";
import { coverUrlFor } from "./format";
import type { ShelfItem } from "./types";

/** Sinopses ficam aqui; capas ficam em COVERS_CACHE, preenchido por client/public/sw.js. */
const DETAILS_CACHE = "estante-details";
const COVERS_CACHE = "estante-covers"; // mesmo nome usado em client/public/sw.js

type Details = { description: string | null };

const detailsKey = (itemId: string) => `/cache/details/${encodeURIComponent(itemId)}`;

/** Cache API não existe fora de HTTPS e pode falhar em modo privado: nesses casos, segue sem cache. */
async function openDetailsCache(): Promise<Cache | null> {
  if (!("caches" in window)) return null;
  try {
    return await caches.open(DETAILS_CACHE);
  } catch {
    return null;
  }
}

/** Sinopse do cache do navegador; na falta, pede ao servidor e guarda se houver texto. */
export async function loadDetails(itemId: string): Promise<Details> {
  const cache = await openDetailsCache();
  const hit = await cache?.match(detailsKey(itemId)).catch(() => undefined);
  if (hit) return (await hit.json()) as Details;
  const details = await Api.details(itemId);
  if (details.description !== null) {
    await cache?.put(detailsKey(itemId), new Response(JSON.stringify(details), { headers: { "Content-Type": "application/json" } })).catch(() => {});
  }
  return details;
}

/** Carrega as capas usadas na lista (M) e no detalhe (L); o service worker guarda as respostas. */
export function preloadCovers(book: ShelfItem["book"]) {
  for (const size of ["M", "L"] as const) {
    const url = coverUrlFor(book, size);
    if (!url) continue;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = url;
  }
}

export async function forgetDetails(itemId: string) {
  const cache = await openDetailsCache();
  await cache?.delete(detailsKey(itemId)).catch(() => {});
}

/** Ao sair da conta: capas e sinopses revelam o que a pessoa lê num aparelho compartilhado. */
export async function clearBookCaches() {
  if (!("caches" in window)) return;
  await Promise.all([caches.delete(DETAILS_CACHE), caches.delete(COVERS_CACHE)]).catch(() => {});
}
