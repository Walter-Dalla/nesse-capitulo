import { Hono } from "hono";
import { env } from "../env.js";
import type { AppEnv } from "../types.js";

/** Rotas públicas do app (sem login): só elas entram no sitemap e ficam liberadas no robots.txt. */
export const PUBLIC_PATHS = ["/", "/login"] as const;

/** Rotas que exigem sessão (ou são API): bloqueadas para robôs, nunca indexadas. */
export const PRIVATE_PREFIXES = ["/api/", "/auth/", "/buscar", "/adicionar", "/livro/", "/anos", "/perfil", "/amigos"] as const;

const ROBOTS = [
  "User-agent: *",
  ...PRIVATE_PREFIXES.map((p) => `Disallow: ${p}`),
  ...PUBLIC_PATHS.map((p) => `Allow: ${p}`),
  "",
].join("\n");

const LLMS = `# Estante

> Tracker de leituras mobile-first (PWA) em português: registre o que você leu, está lendo, quer ler e abandonou, com nota, resenha, página atual e histórico por ano. Amigos veem um selo de quem já leu cada livro e podem trocar comentários públicos ou privados.

Site pessoal e gratuito. O conteúdo das estantes é privado por usuário: só a página inicial e o login são públicos; a API (/api/*) exige sessão e não deve ser rastreada.

## Páginas públicas

- [Início](/): apresentação e entrada no app
- [Login](/login): entrar com Google
- [Manifesto PWA](/manifest.webmanifest): nome, ícones e categorias do app

## O que o app faz

- Estante com quatro status: lendo, quero ler, lido e abandonado
- Busca de livros no Google Books e na Open Library, ou cadastro manual (ISBN opcional)
- Nota de 1 a 5 estrelas, resenha, datas de início e fim, página atual
- Histórico por ano de leitura e estatísticas (livros, páginas, nota média)
- Amigos por link de convite; selo de quem já leu; comentários públicos e privados
- Instalável como PWA e publicado como app Android (TWA)

## Opcional

- [Código-fonte e documentação](https://github.com/Walter-Dalla/nesse-capitulo)
`;

/** Arquivos de descoberta para buscadores e assistentes de IA: robots.txt, sitemap.xml e llms.txt. */
export function seoRoutes() {
  const app = new Hono<AppEnv>();
  const cache = { "Cache-Control": "public, max-age=86400" };

  app.get("/robots.txt", (c) => c.text(`${ROBOTS}Sitemap: ${env.baseUrl}/sitemap.xml\n`, 200, cache));

  app.get("/sitemap.xml", (c) => {
    const urls = PUBLIC_PATHS.map((p) => `  <url><loc>${env.baseUrl}${p}</loc><changefreq>monthly</changefreq></url>`).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return c.body(xml, 200, { ...cache, "Content-Type": "application/xml; charset=utf-8" });
  });

  // Convenção llms.txt (llmstxt.org): resumo em Markdown para assistentes de IA. Links relativos viram absolutos com BASE_URL.
  app.get("/llms.txt", (c) => c.text(LLMS.replaceAll("](/", `](${env.baseUrl}/`), 200, { ...cache, "Content-Type": "text/markdown; charset=utf-8" }));

  return app;
}
