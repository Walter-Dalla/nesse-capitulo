import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import type { DB } from "./db.js";
import { env } from "./env.js";
import { authRoutes, requireAuth } from "./auth.js";
import { searchRoutes } from "./routes/search.js";
import { shelfRoutes } from "./routes/shelf.js";
import { statsRoutes } from "./routes/stats.js";
import { adsRoutes } from "./routes/ads.js";
import { friendsRoutes } from "./routes/friends.js";
import { commentsRoutes } from "./routes/comments.js";
import { seoRoutes } from "./routes/seo.js";
import { accountRoutes } from "./routes/account.js";
import { legalRoutes } from "./routes/legal.js";
import { reportsRoutes } from "./routes/reports.js";
import { moderationRoutes } from "./routes/moderation.js";
import type { AppEnv } from "./types.js";

/** Caminhos que pertencem à API/autenticação (nunca caem no fallback da SPA). */
export function isApiPath(path: string) {
  return path === "/api" || path === "/auth" || path.startsWith("/api/") || path.startsWith("/auth/");
}

/** Monta a aplicação Hono (sem servir estáticos) — reutilizado nos testes. */
export function createApp(db: DB) {
  const app = new Hono<AppEnv>();

  if (!env.isProd) app.use(logger());
  app.use(secureHeaders({ crossOriginEmbedderPolicy: false }));
  app.use(csrf());

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/", authRoutes(db));
  app.route("/", seoRoutes());
  app.route("/", legalRoutes());

  const api = new Hono<AppEnv>();
  api.use("/api/*", requireAuth(db));
  api.route("/", searchRoutes());
  api.route("/", shelfRoutes(db));
  api.route("/", statsRoutes(db));
  api.route("/", adsRoutes(db));
  api.route("/", friendsRoutes(db));
  api.route("/", commentsRoutes(db));
  api.route("/", accountRoutes(db));
  api.route("/", reportsRoutes(db));
  api.route("/", moderationRoutes(db));
  app.route("/", api);

  app.notFound((c) => {
    if (isApiPath(c.req.path)) return c.json({ error: "Rota não encontrada" }, 404);
    return c.text("Not found", 404);
  });

  return app;
}
