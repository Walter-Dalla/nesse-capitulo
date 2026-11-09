import { Hono } from "hono";
import { env } from "../env.js";
import type { AppEnv } from "../types.js";

/** Rotas públicas do app (sem login): só elas entram no sitemap e ficam liberadas no robots.txt. */
export const PUBLIC_PATHS = ["/", "/login", "/privacidade", "/termos", "/excluir-conta"] as const;

/** Home em PT e ES (`/` é a versão em EN): só no sitemap, o `Allow: /` do robots.txt já as cobre. */
const LOCALIZED_HOME_PATHS = ["/?lang=pt", "/?lang=es"] as const;

/** Rotas que exigem sessão (ou são API): bloqueadas para robôs, nunca indexadas. */
export const PRIVATE_PREFIXES = ["/api/", "/auth/", "/buscar", "/adicionar", "/livro/", "/anos", "/perfil", "/amigos", "/moderacao"] as const;

const ROBOTS = [
  "User-agent: *",
  ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`),
  ...PUBLIC_PATHS.map((p) => `Allow: ${p}`),
  "",
].join("\n");

const LLMS = `# Estante

> Reading tracker, mobile-first (PWA), available in Portuguese, English and Spanish: log what you have read, are reading, want to read and abandoned, with rating, review, current page and history by year. Friends see a badge showing who has already read each book and can exchange public or private comments.

Personal, free site. Shelf content is private per user: only the home page, login, privacy policy, terms of use and account deletion pages are public; the API (/api/*) requires a session and must not be crawled.

## Public pages

- [Home](/): introduction and entry to the app
- [Login](/login): sign in with Google
- [Privacy policy](/privacidade): what data is kept, who sees it and how long it is kept
- [Terms of use](/termos): who can use the app, forbidden content and moderation
- [Delete account](/excluir-conta): how to delete an account and what is erased
- [PWA manifest](/manifest.webmanifest): app name, icons and categories

## What the app does

- Shelf with four statuses: reading, want to read, read and abandoned
- Book search on Google Books and Open Library, or manual entry (ISBN optional)
- Rating from 1 to 5 stars, review, start and finish dates, current page
- Reading history by year and statistics (books, pages, average rating)
- Friends by invite link; badge showing who has already read a book; public and private comments
- Installable as a PWA and published as an Android app (TWA)

## Optional

- [Source code and documentation](https://github.com/Walter-Dalla/nesse-capitulo)
`;

/** Arquivos de descoberta para buscadores e assistentes de IA: robots.txt, sitemap.xml e llms.txt. */
export function seoRoutes() {
  const app = new Hono<AppEnv>();
  const cache = { "Cache-Control": "public, max-age=86400" };

  app.get("/robots.txt", (c) => c.text(`${ROBOTS}Sitemap: ${env.baseUrl}/sitemap.xml\n`, 200, cache));

  app.get("/sitemap.xml", (c) => {
    const urls = [...PUBLIC_PATHS, ...LOCALIZED_HOME_PATHS].map((p) => `  <url><loc>${env.baseUrl}${p}</loc><changefreq>monthly</changefreq></url>`).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return c.body(xml, 200, { ...cache, "Content-Type": "application/xml; charset=utf-8" });
  });

  // Convenção llms.txt (llmstxt.org): resumo em Markdown para assistentes de IA. Links relativos viram absolutos com BASE_URL.
  app.get("/llms.txt", (c) => c.text(LLMS.replaceAll("](/", `](${env.baseUrl}/`), 200, { ...cache, "Content-Type": "text/markdown; charset=utf-8" }));

  return app;
}
