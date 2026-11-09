import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "./env.js";
import { LOCALE_COOKIE, negotiateLocale, type Locale } from "./locale.js";
import type { AppEnv } from "./types.js";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Responde com o HTML do idioma negociado. Sem depender de `app.ts`: `html.ts` importa `app.ts`, e as rotas montadas por ele não poderiam importar `html.ts`. */
export function respondNegotiated(c: Context<AppEnv>, pages: Record<Locale, string>) {
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
