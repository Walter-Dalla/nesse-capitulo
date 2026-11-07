/**
 * Convite de amizade guardado durante o login: quem abre o link deslogado passa por /login
 * (Google ou dev, que sempre terminam em "/") e volta para a tela do convite.
 * Puro: recebe o armazenamento por parâmetro, para ser testado sem DOM.
 */
export interface InviteStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** Validade local: em aparelho compartilhado, outra pessoa que entre depois não vira amiga. */
export const PENDING_INVITE_TTL_MS = 60 * 60 * 1000;

const KEY = "estante:convite";
const INVITE_PATH = /^\/amigos\/convite\/([^/]+)\/?$/;

const NO_STORE: InviteStore = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** localStorage do navegador (o login pode voltar em outra aba); vazio se o acesso for bloqueado. */
export function browserInviteStore(): InviteStore {
  try {
    return (globalThis as unknown as { localStorage?: InviteStore }).localStorage ?? NO_STORE;
  } catch {
    return NO_STORE;
  }
}

/** Código de "/amigos/convite/<code>"; null em qualquer outra rota. */
export function inviteCodeFromPath(pathname: string): string | null {
  return INVITE_PATH.exec(pathname)?.[1] ?? null;
}

export function savePendingInvite(store: InviteStore, code: string, now = Date.now()): void {
  try {
    store.setItem(KEY, JSON.stringify({ code, savedAt: now }));
  } catch {
    // modo privado: segue sem guardar; o link original continua valendo
  }
}

export function clearPendingInvite(store: InviteStore): void {
  try {
    store.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}

/** Código guardado e ainda válido; vencido ou corrompido devolve null e é removido. */
export function readPendingInvite(store: InviteStore, now = Date.now()): string | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { code?: unknown; savedAt?: unknown };
    const age = typeof data.savedAt === "number" ? now - data.savedAt : NaN;
    if (typeof data.code === "string" && data.code && age >= 0 && age <= PENDING_INVITE_TTL_MS) return data.code;
  } catch {
    // JSON corrompido ou armazenamento indisponível
  }
  clearPendingInvite(store);
  return null;
}

/** Logado: para onde redirecionar. null em rota de convite (qualquer código), sem guardado ou vencido. */
export function pendingInviteRedirect(store: InviteStore, pathname: string, now = Date.now()): string | null {
  if (inviteCodeFromPath(pathname) !== null) return null;
  const code = readPendingInvite(store, now);
  return code ? `/amigos/convite/${code}` : null;
}
