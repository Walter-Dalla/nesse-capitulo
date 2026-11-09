import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import type { Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { isApiPath } from "./app.js";
import { hasSession } from "./auth.js";
import type { DB } from "./db.js";
import { env } from "./env.js";
import { renderLanding } from "./landingText.js";
import { HTML_LANG, LOCALE_COOKIE, LOCALES, negotiateLocale, type Locale } from "./locale.js";
import type { AppEnv } from "./types.js";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
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

  function respond(c: Context<AppEnv>, pages: Record<Locale, string>) {
    const { locale, fromQuery } = negotiateLocale({
      query: c.req.query("lang"),
      cookie: getCookie(c, LOCALE_COOKIE),
      acceptLanguage: c.req.header("accept-language"),
      country: c.req.header("cf-ipcountry"),
    });
    // Só a escolha explícita grava: quem nunca escolheu acompanha o idioma do aparelho. Sem HttpOnly porque o seletor da SPA também grava.
    if (fromQuery) {
      setCookie(c, LOCALE_COOKIE, locale, {
        sameSite: "Lax",
        secure: env.baseUrl.startsWith("https://"),
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
      });
    }
    c.header("Cache-Control", "no-cache");
    c.header("Vary", "Accept-Language, CF-IPCountry, Cookie");
    return c.html(pages[locale]);
  }

  app.use(
    "/assets/*",
    serveStatic({ root, onFound: (_p, c) => c.header("Cache-Control", "public, max-age=31536000, immutable") }),
  );
  // Home: visitante sem sessão recebe a página estática (landing.html, indexável, sem JS); logado cai na SPA (estante).
  app.get("/", (c) => respond(c, hasSession(db, c) ? spaHtml : landingHtml));
  app.get("/landing.html", (c) => c.redirect("/", 301));
  app.use("*", serveStatic({ root }));
  // fallback da SPA: qualquer rota que não seja API/auth devolve o index.html
  app.get("*", (c, next) => (isApiPath(c.req.path) ? next() : respond(c, spaHtml)));
}
