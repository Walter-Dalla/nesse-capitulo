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
import type { AppEnv } from "./types.js";

/** Monta a aplicação Hono (sem servir estáticos) — reutilizado nos testes. */
export function createApp(db: DB) {
  const app = new Hono<AppEnv>();

  if (!env.isProd) app.use(logger());
  app.use(secureHeaders({ crossOriginEmbedderPolicy: false }));
  app.use(csrf());

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.route("/", authRoutes(db));

  const api = new Hono<AppEnv>();
  api.use("/api/*", requireAuth(db));
  api.route("/", searchRoutes());
  api.route("/", shelfRoutes(db));
  api.route("/", statsRoutes(db));
  api.route("/", adsRoutes(db));
  app.route("/", api);

  app.notFound((c) => {
    if (c.req.path.startsWith("/api/") || c.req.path.startsWith("/auth/")) return c.json({ error: "Rota não encontrada" }, 404);
    return c.text("Not found", 404);
  });

  return app;
}
