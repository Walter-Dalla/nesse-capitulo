import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import type { Hono } from "hono";
import { isApiPath } from "./app.js";
import { hasSession } from "./auth.js";
import type { DB } from "./db.js";
import { renderLanding } from "./landingText.js";
import { HTML_LANG, LOCALES, type Locale } from "./locale.js";
import { respondNegotiated } from "./localeResponse.js";
import type { AppEnv } from "./types.js";

const SPA_HTML_TAG = '<html lang="en">';

/** Serve o front buildado pelo Vite no mesmo processo. Todo HTML sai no idioma negociado: a home renderizada, a SPA com `data-locale`. */
export function mountClient(app: Hono<AppEnv>, db: DB, clientDir: string) {
  const root = path.relative(process.cwd(), clientDir) || ".";
  const spaTemplate = fs.readFileSync(path.join(clientDir, "index.html"), "utf8");
  if (!spaTemplate.includes(SPA_HTML_TAG)) throw new Error(`index.html sem ${SPA_HTML_TAG}: a SPA ficaria sem data-locale`);
  const landingTemplate = fs.readFileSync(path.join(clientDir, "landing.html"), "utf8");

  const landingHtml = {} as Record<Locale, string>;
  const spaHtml = {} as Record<Locale, string>;
  for (const locale of LOCALES) {
    landingHtml[locale] = renderLanding(landingTemplate, locale);
    spaHtml[locale] = spaTemplate.replace(SPA_HTML_TAG, `<html lang="${HTML_LANG[locale]}" data-locale="${locale}">`);
  }

  app.use(
    "/assets/*",
    serveStatic({ root, onFound: (_p, c) => c.header("Cache-Control", "public, max-age=31536000, immutable") }),
  );
  // Home: visitante sem sessão recebe a página estática (landing.html, indexável, sem JS); logado cai na SPA (estante).
  app.get("/", (c) => respondNegotiated(c, hasSession(db, c) ? spaHtml : landingHtml));
  app.get("/landing.html", (c) => c.redirect("/", 301));
  app.use("*", serveStatic({ root }));
  // fallback da SPA: qualquer rota que não seja API/auth devolve o index.html
  app.get("*", (c, next) => (isApiPath(c.req.path) ? next() : respondNegotiated(c, spaHtml)));
}
