import { Hono } from "hono";
import { env } from "../env.js";
import { LEGAL_PATHS, renderLegal, type LegalPage } from "../legalText.js";
import { LOCALES, type Locale } from "../locale.js";
import { respondNegotiated } from "../localeResponse.js";
import type { AppEnv } from "../types.js";

/** Política, termos e exclusão de conta: públicas, sem login, porque a Google Play as abre de fora do app. */
export function legalRoutes() {
  const app = new Hono<AppEnv>();

  for (const page of Object.keys(LEGAL_PATHS) as LegalPage[]) {
    const pages = {} as Record<Locale, string>;
    for (const locale of LOCALES) pages[locale] = renderLegal(page, locale, env.baseUrl);
    app.get(LEGAL_PATHS[page], (c) => respondNegotiated(c, pages));
  }

  return app;
}
