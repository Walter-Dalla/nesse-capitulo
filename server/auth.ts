import { Hono, type Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { randomBytes, randomUUID } from "node:crypto";
import type { DB } from "./db.js";
import { env, googleLoginEnabled } from "./env.js";
import { hasAcceptedTerms } from "./terms.js";
import { isModerator } from "./moderators.js";
import type { AppEnv, User } from "./types.js";

export const SESSION_COOKIE = "sid";
const STATE_COOKIE = "oauth_state";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const BANNED = { error: "Conta suspensa por violar os termos de uso", code: "ACCOUNT_BANNED" } as const;

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

// ---------- sessões ----------

export function createSession(db: DB, userId: string) {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  // limpeza oportunista de sessões expiradas
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  return { id, expiresAt };
}

function setSessionCookie(c: any, sessionId: string, expiresAt: number) {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: env.baseUrl.startsWith("https://"),
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function findSession(db: DB, sessionId: string | undefined): { user: User; adUnlocked: boolean } | null {
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.google_sub, u.email, u.name, u.picture, u.terms_version, u.banned_at, s.ad_unlocked
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ? AND u.banned_at IS NULL`,
    )
    .get(sessionId, Date.now()) as (User & { ad_unlocked: number }) | undefined;
  if (!row) return null;
  const { ad_unlocked, ...user } = row;
  return { user, adUnlocked: ad_unlocked === 1 };
}

export function findUserBySession(db: DB, sessionId: string | undefined): User | null {
  return findSession(db, sessionId)?.user ?? null;
}

/** Há uma sessão válida no cookie? (sem exigir login: usado para escolher entre home estática e SPA) */
export function hasSession(db: DB, c: Context) {
  return findSession(db, getCookie(c, SESSION_COOKIE)) !== null;
}

export function upsertGoogleUser(db: DB, p: GoogleProfile): User {
  const existing = db.prepare("SELECT * FROM users WHERE google_sub = ?").get(p.sub) as User | undefined;
  if (existing) {
    db.prepare("UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?").run(
      p.email ?? existing.email,
      p.name ?? existing.name,
      p.picture ?? existing.picture,
      existing.id,
    );
    return { ...existing, email: p.email ?? existing.email, name: p.name ?? existing.name, picture: p.picture ?? existing.picture };
  }
  const user: User = {
    id: randomUUID(),
    google_sub: p.sub,
    email: p.email ?? null,
    name: p.name ?? null,
    picture: p.picture ?? null,
    terms_version: null,
    banned_at: null,
  };
  db.prepare("INSERT INTO users (id, google_sub, email, name, picture) VALUES (?, ?, ?, ?, ?)").run(
    user.id, user.google_sub, user.email, user.name, user.picture,
  );
  return user;
}

/** Middleware: exige usuário logado e o coloca em c.var.user */
export function requireAuth(db: DB) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const sid = getCookie(c, SESSION_COOKIE);
    const session = findSession(db, sid);
    if (!session || !sid) return c.json({ error: "Não autenticado" }, 401);
    c.set("user", session.user);
    c.set("sessionId", sid);
    // sem anúncios configurados, tudo fica liberado
    c.set("adUnlocked", !env.ads.enabled || session.adUnlocked);
    await next();
  });
}

// ---------- Google OAuth 2.0 / OpenID Connect ----------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

function redirectUri() {
  return `${env.baseUrl}/auth/google/callback`;
}

export function decodeIdToken(idToken: string): GoogleProfile {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("id_token inválido");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (!payload.sub) throw new Error("id_token sem sub");
  return { sub: payload.sub, email: verifiedEmail(payload), name: payload.name, picture: payload.picture };
}

/**
 * E-mail só se o Google o declarar verificado: sem isso uma conta poderia assumir o e-mail de outra
 * (por exemplo o do moderador). O id_token traz booleano; o tokeninfo, texto.
 */
function verifiedEmail(claims: { email?: unknown; email_verified?: unknown }): string | undefined {
  const verified = claims.email_verified === true || claims.email_verified === "true";
  return verified && typeof claims.email === "string" ? claims.email : undefined;
}

/** Verifica um id_token recebido do cliente (ex.: Google Sign-In nativo no Android) */
export async function verifyIdTokenRemote(idToken: string): Promise<GoogleProfile> {
  const res = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) throw new Error("id_token rejeitado pelo Google");
  const info = (await res.json()) as any;
  const allowed = new Set([env.google.clientId, ...env.google.extraClientIds].filter(Boolean));
  if (!allowed.has(info.aud)) throw new Error("id_token emitido para outro aplicativo (aud)");
  if (info.iss !== "https://accounts.google.com" && info.iss !== "accounts.google.com") throw new Error("issuer inválido");
  if (Number(info.exp) * 1000 < Date.now()) throw new Error("id_token expirado");
  return { sub: info.sub, email: verifiedEmail(info), name: info.name, picture: info.picture };
}

export function authRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  app.get("/auth/providers", (c) =>
    c.json({
      google: googleLoginEnabled,
      dev: env.allowDevLogin,
      ads: { enabled: env.ads.enabled, provider: env.ads.provider, adsenseClient: env.ads.adsenseClient || null },
    }),
  );

  // 1) redireciona ao Google
  app.get("/auth/google", (c) => {
    if (!googleLoginEnabled) return c.json({ error: "Login Google não configurado (GOOGLE_CLIENT_ID/SECRET)" }, 503);
    const state = randomBytes(16).toString("base64url");
    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true, sameSite: "Lax", secure: env.baseUrl.startsWith("https://"), path: "/", maxAge: 600,
    });
    const params = new URLSearchParams({
      client_id: env.google.clientId,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return c.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  });

  // 2) callback: troca o code por tokens e cria a sessão
  app.get("/auth/google/callback", async (c) => {
    const { code, state, error } = c.req.query();
    const expected = getCookie(c, STATE_COOKIE);
    deleteCookie(c, STATE_COOKIE, { path: "/" });
    if (error) return c.redirect(`/login?error=${encodeURIComponent(error)}`);
    if (!code || !state || state !== expected) return c.redirect("/login?error=state");

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return c.redirect("/login?error=token");
    const tokens = (await res.json()) as { id_token?: string };
    if (!tokens.id_token) return c.redirect("/login?error=token");

    // O id_token veio direto do endpoint do Google via TLS, então decodificar é seguro aqui.
    const user = upsertGoogleUser(db, decodeIdToken(tokens.id_token));
    if (user.banned_at) return c.redirect("/login?error=banned");
    const session = createSession(db, user.id);
    setSessionCookie(c, session.id, session.expiresAt);
    return c.redirect("/");
  });

  // 3) login nativo (Android/iOS): o app envia o id_token obtido pelo SDK do Google
  app.post("/auth/google/token", async (c) => {
    if (!env.google.clientId) return c.json({ error: "Login Google não configurado" }, 503);
    const body = (await c.req.json().catch(() => ({}))) as { idToken?: string };
    if (!body.idToken) return c.json({ error: "idToken obrigatório" }, 400);
    try {
      const user = upsertGoogleUser(db, await verifyIdTokenRemote(body.idToken));
      if (user.banned_at) return c.json(BANNED, 403);
      const session = createSession(db, user.id);
      setSessionCookie(c, session.id, session.expiresAt);
      return c.json({ user: publicUser(user) });
    } catch (e) {
      return c.json({ error: (e as Error).message }, 401);
    }
  });

  // login de desenvolvimento (desligado em produção)
  app.post("/auth/dev", async (c) => {
    if (!env.allowDevLogin) return c.json({ error: "Login dev desabilitado" }, 403);
    const body = (await c.req.json().catch(() => ({}))) as { name?: string; email?: string };
    const email = body.email?.trim() || "dev@example.com";
    const user = upsertGoogleUser(db, { sub: `dev:${email}`, email, name: body.name?.trim() || "Leitor(a) Dev" });
    if (user.banned_at) return c.json(BANNED, 403);
    const session = createSession(db, user.id);
    setSessionCookie(c, session.id, session.expiresAt);
    return c.json({ user: publicUser(user) });
  });

  app.post("/auth/logout", (c) => {
    const sid = getCookie(c, SESSION_COOKIE);
    if (sid) db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/api/me", (c) => {
    const session = findSession(db, getCookie(c, SESSION_COOKIE));
    if (!session) return c.json({ user: null, adUnlocked: false, termsAccepted: false, isModerator: false });
    return c.json({
      user: publicUser(session.user),
      adUnlocked: !env.ads.enabled || session.adUnlocked,
      termsAccepted: hasAcceptedTerms(session.user),
      isModerator: isModerator(session.user),
    });
  });

  return app;
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, picture: u.picture };
}
