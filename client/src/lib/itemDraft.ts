import type { ShelfItem, ShelfPatch } from "./types";

/** Alterações feitas na tela do livro que ainda não foram salvas no servidor. */
export type ItemDraft = Pick<ShelfPatch, "status" | "rating" | "review" | "startedAt" | "finishedAt" | "readYear">;

const PREFIX = "estante:rascunho:";

/** sessionStorage mantém o rascunho ao navegar e recarregar; pode falhar em modo privado. */
export function readDraft(itemId: string): ItemDraft {
  try {
    return JSON.parse(sessionStorage.getItem(PREFIX + itemId) ?? "{}") as ItemDraft;
  } catch {
    return {};
  }
}

export function writeDraft(itemId: string, draft: ItemDraft) {
  try {
    if (Object.keys(draft).length) sessionStorage.setItem(PREFIX + itemId, JSON.stringify(draft));
    else sessionStorage.removeItem(PREFIX + itemId);
  } catch {
    // segue só com o rascunho em memória
  }
}

export function clearDrafts() {
  try {
    Object.keys(sessionStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // nada a limpar
  }
}

/** Só o que difere do valor salvo: desfazer uma alteração à mão não conta como alteração. */
export function changedFields(item: ShelfItem, draft: ItemDraft): ItemDraft {
  const keys = Object.keys(draft) as (keyof ItemDraft)[];
  return Object.fromEntries(keys.filter((k) => draft[k] !== item[k]).map((k) => [k, draft[k]])) as ItemDraft;
}
