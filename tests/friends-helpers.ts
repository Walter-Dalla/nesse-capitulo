// Helpers dos testes de amizades: vários usuários logados no mesmo banco em memória.
process.env.ALLOW_DEV_LOGIN = "true";
process.env.NODE_ENV = "test";
const { openDatabase } = await import("../server/db.ts");
const { createApp } = await import("../server/app.ts");

export { openDatabase };
export type DB = ReturnType<typeof openDatabase>;
export interface Res { status: number; json: any }
export type Call = (method: string, path: string, body?: unknown) => Promise<Res>;
export interface Session { call: Call; user: { id: string; name: string | null; email: string | null; picture: string | null } }

/** Cliente HTTP com cookie próprio, falando com uma app montada sobre `db`. */
export function client(db: DB): Call {
  const app = createApp(db);
  let cookie = "";
  return async (method, path, body) => {
    const res = await app.request(path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: "http://localhost:3000", Host: "localhost:3000" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const json: any = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    return { status: res.status, json };
  };
}

/** Faz login dev de um usuário novo no `db`. */
export async function login(db: DB, name: string, email = `${name.toLowerCase()}@x.com`): Promise<Session> {
  const call = client(db);
  const r = await call("POST", "/auth/dev", { name, email });
  if (r.status !== 200) throw new Error(`login falhou: ${r.status}`);
  return { call, user: r.json.user };
}

/** Gera um convite de `inviter`. */
export async function invite(inviter: Session): Promise<string> {
  const r = await inviter.call("POST", "/api/friends/invites");
  if (r.status !== 201) throw new Error(`convite falhou: ${r.status}`);
  return r.json.code;
}

/** Torna `a` e `b` amigos pela API (a convida, b confirma). */
export async function befriend(a: Session, b: Session): Promise<void> {
  const code = await invite(a);
  const r = await b.call("POST", `/api/friends/invites/${code}/accept`);
  if (r.status !== 201) throw new Error(`accept falhou: ${r.status}`);
}

/** Dois usuários logados no mesmo banco, já amigos. */
export async function twoFriends(db: DB = openDatabase(":memory:")) {
  const ana = await login(db, "Ana");
  const bia = await login(db, "Bia");
  await befriend(ana, bia);
  return { db, ana, bia };
}

/** Adiciona um livro à estante de `s` e devolve o item. */
export async function addBook(s: Session, book: Record<string, unknown>, status = "read", extra: Record<string, unknown> = {}) {
  const r = await s.call("POST", "/api/shelf", { book, status, ...extra });
  if (r.status !== 201 && r.status !== 200) throw new Error(`addBook falhou: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.item;
}

/** Chaves que nunca podem aparecer nas respostas de amizade. */
export const PRIVATE_KEYS = ["rating", "review", "startedAt", "finishedAt", "description", "email"];

/** Todas as chaves de um JSON, em qualquer profundidade. */
export function allKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) allKeys(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) { out.add(k); allKeys(v, out); }
  }
  return out;
}
