import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { SESSION_COOKIE } from "../auth.js";
import type { DB } from "../db.js";
import type { AppEnv } from "../types.js";

export function accountRoutes(db: DB) {
  const app = new Hono<AppEnv>();

  // apaga a conta; as chaves estrangeiras e o gatilho de livros manuais levam o resto
  app.delete("/api/account", (c) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(c.var.user.id);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
