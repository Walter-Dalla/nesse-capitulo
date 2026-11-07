# Estante

Tracker de leituras mobile-first (PWA React + API Hono + SQLite via `node:sqlite`), um único processo Node. Visão completa em `README.md`.

## Onde mora cada camada

- `client/src/pages/` — telas (Login, Shelf, Search, AddManual, BookDetail, Years, Friends, FriendDetail, FriendInvite, Profile); `client/src/components/` — UI compartilhada; `client/src/lib/` — `api.ts` (chamadas), `hooks.ts`, `types.ts`, `pendingInvite.ts` (convite que sobrevive ao login).
- `client/public/` — manifest, service worker, ícones, `.well-known/assetlinks.json` (TWA).
- `server/app.ts` — monta a app Hono; `server/auth.ts` — sessões + Google OAuth; `server/db.ts` — schema SQLite; `server/types.ts` — tipos do domínio (`Status`, `Book`, `ShelfItem`); `server/validate.ts`; `server/env.ts`.
- `server/routes/` — `search.ts` (Google Books + Open Library, cache, rate limit), `shelf.ts`, `stats.ts`, `ads.ts`, `friends.ts` (convite, amigos, selo de quem já leu).
- `tests/` — testes da API com `node:test` e banco em memória.
- `data/` — banco SQLite em runtime (ignorado pelo git).

## Comandos

```bash
npm install && cp .env.example .env   # ALLOW_DEV_LOGIN=true já vem no exemplo
npm run dev        # API :3000 + Vite :5173
npm test           # tests/*.test.ts
npm run typecheck  # front, server e tests
npm run build      # dist/client + dist/server
npm start          # node dist/server/index.js
```

CI (`.github/workflows/ci.yml`): `npm ci`, `typecheck`, `test`, `build` no Node 24.

## Docs

- `README.md` — stack, rotas da API, regras de status/ano, o que é persistido por livro, deploy e Play Store.
- `docs/MONETIZACAO.md` — gate de anúncio recompensado (`/api/ads/*`); ler antes de mexer em criação de livros.
- `docs/GLOSSARIO.md` e `docs/features/` — vocabulário e mapa de features (hook do harness).
- `.claude/perfil/` — fatos do projeto para as skills `wh`.
