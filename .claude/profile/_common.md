# Perfil comum

## Clone
— (o checkout atual, `/home/walter/nesse-capitulo`, WSL2; toolchain nativa Linux) [inferido]

## Toolchain
Node 22.23 local (`engines: >=22.13`; CI usa 24) via `~/.local/bin/node`; `npm` (lockfile `package-lock.json`, `npm ci` na CI) [package.json, ci: ci.yml]
TypeScript 7 com `tsx` para rodar `.ts` direto (`tsx watch`, `node --test --import tsx`) [package.json]
HTTP local: `curl` [inferido]
Matar processo: `pkill -f "tsx watch server/index.ts"` / `fuser -k <porta>/tcp` [inferido]
Python: `/usr/bin/python3` (só para scripts do harness) [inferido]

## Git
Principal: `main`. Remote: `origin` (`https://github.com/Walter-Dalla/nesse-capitulo.git`). [git remote]
Sem branch protegida declarada; identidade local `Walter Dalla`, push HTTPS no próprio WSL. [git config, inferido]
Checkout compartilhado com outras sessões: `git branch --show-current` antes de commitar. [COMUM.md]

## Ports
Dono: `3000` (API) e `5173` (Vite). [server/env.ts, vite.config.ts]
Agentes do `/wh:implementation` (6 portas): `3100–3105`. [confirmado pelo dono]
QA visual/e2e: a partir de `3108`, primeira livre. [confirmado pelo dono]
A API aceita `PORT=<porta>`; o Vite dev fixa 5173 e faz proxy de `/api` e `/auth` para `localhost:3000` (serviço isolado = API servindo `dist/client`, sem Vite). [server/env.ts, vite.config.ts]

## Navigation
`.codegraph/` presente na raiz do clone (ignorado pelo git; worktree nasce sem). `codegraph explore` antes de `grep`/`Read`. [ls]
Mapa de pastas em `CLAUDE.md`; rotas em `server/routes/*.ts` e `server/auth.ts`; telas em `client/src/pages/`. [CLAUDE.md]

## Docs
`CLAUDE.md` — mapa do repo e comandos. [CLAUDE.md]
`README.md` — stack, tabela de rotas, regras de status/ano, persistência por livro, deploy/Play Store. [CLAUDE.md]
`docs/MONETIZACAO.md` — gate de anúncio recompensado. [CLAUDE.md]
`docs/GLOSSARIO.md` — vocabulário negócio ↔ código. [adotar]
`docs/features/README.md` — mapa de features. [adotar]

## Limits
Produção: `https://nesse-capitulo.walterdalla.uk` (deploy pelo dono); nada a tocar pelos agentes. Segredos: `.env` (ignorado), `GOOGLE_CLIENT_SECRET`, `ADSENSE_CLIENT_ID`. [.env.example, .gitignore]
Banco do dono: `data/estante.db` (nunca usar em teste; usar `DATABASE_PATH` próprio ou `:memory:`). [server/env.ts, tests/api.test.ts]
Portas `3000` e `5173` do dono. APIs externas (Google Books, Open Library, OAuth) não são chamadas em teste automatizado. [inferido]
