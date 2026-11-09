---
aliases: [seo, robots, robots.txt, sitemap, llms.txt, open graph, og, meta tags, buscadores, indexação, canonical]
---
# SEO e descoberta por buscadores e IAs

Só a página inicial e o login são públicos; todo o resto exige sessão e fica fora da indexação. A home para visitantes é uma página estática (`client/landing.html`, HTML + CSS inline, sem JS): o servidor a entrega em `/` quando não há sessão válida e entrega a SPA (estante) quando há. Os arquivos de descoberta são gerados pelo servidor para usarem a `BASE_URL` do `.env`.

## Símbolos de entrada
`hasSession` (`server/auth.ts`) decide em `mountClient` (`server/html.ts`) entre `landing.html` e `index.html` para `GET /`; `/landing.html` redireciona 301 para `/`. As duas páginas são entradas do build em `vite.config.ts` (`rollupOptions.input`).
`seoRoutes`, `PUBLIC_PATHS` e `PRIVATE_PREFIXES` (`server/routes/seo.ts`): `GET /robots.txt`, `GET /sitemap.xml`, `GET /llms.txt`; montados antes da API em `createApp` (`server/app.ts`). Metadados (`description`, canonical, Open Graph, Twitter Card, JSON-LD `WebApplication`, `<noscript>`) em `client/index.html`; o placeholder `%SITE_URL%` é trocado pela `BASE_URL` no build pelo plugin `htmlBaseUrl` (`vite.config.ts`). Testes em `tests/seo.test.ts`.

## Regras
- Nova rota pública: adicionar em `PUBLIC_PATHS` (entra no sitemap e no `Allow`). Nova rota logada: adicionar o prefixo em `PRIVATE_PREFIXES`.
- `BASE_URL` precisa estar definida **no build** (`npm run build`) para canonical e `og:*` saírem absolutos; sem ela sai `http://localhost:3000`.
- `client/landing.html` é o modelo único da home (hero, recursos, como funciona, FAQ com JSON-LD `FAQPage`), com `{{chave}}`; o texto dos 3 idiomas vive em `server/landingText.ts` e `renderLanding` monta no boot. Em dev pelo Vite (`:5173`) `/` continua sendo a SPA; a landing só aparece no servidor Node (`npm run build && npm start`) ou em `http://localhost:5173/landing.html`.
- `og:image` usa `icons/icon-512.png` (quadrado, card `summary`). Para card grande, criar `client/public/og.png` 1200×630 e trocar em `client/index.html`.

## Interações
- [idioma](idioma.md): `/` sem cabeçalho sai em EN; PT e ES ficam em `/?lang=`, com `hreflang` e no sitemap; `llms.txt` é em EN.
- [pwa](pwa.md): `sw.js` guarda `/` no app shell na instalação, então o fallback offline da home é a landing ou a SPA conforme o estado de login na hora de instalar; mesmo `manifest.webmanifest` e ícones; `isApiPath` não inclui essas rotas, mas elas respondem antes do fallback da SPA.
- [conta](conta.md): rotas logadas (`/livro/*`, `/amigos/*`, `/perfil`, `/anos`, `/buscar`, `/adicionar`) e `/auth/*` estão em `Disallow`.
