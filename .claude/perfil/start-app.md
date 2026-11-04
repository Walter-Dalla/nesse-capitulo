# Perfil do /wh:start-app

## Serviços
Pré: `npm install` e `cp .env.example .env` (já traz `ALLOW_DEV_LOGIN=true`). [README.md]
dev (API + Vite juntos) — `npm run dev` (background, log em `/tmp/estante-dev.log`) · stop: `pkill -f "tsx watch server/index.ts"; pkill -f "vite"` · status: `fuser 3000/tcp 5173/tcp` · health: `curl -s http://localhost:3000/api/health` → `{"ok":true}`. [package.json, server/app.ts, inferido]
Só API: `npm run dev:server` (`tsx watch server/index.ts`, porta `PORT`, padrão 3000). Só front: `npm run dev:client` (Vite 5173 com proxy). [package.json, vite.config.ts]
Produção local: `npm run build && npm start` (uma porta, `dist/server/index.js` serve `dist/client`; login dev desligado a menos que `NODE_ENV=development`). [README.md, server/env.ts]

## Cliente
Navegador em `http://localhost:5173` (dev) ou `http://localhost:3000` (build). Chama `/api/*` e `/auth/*` na mesma origem (proxy em dev). [vite.config.ts, README.md]
Sem janela: `curl -s -c /tmp/sid -X POST http://localhost:3000/auth/dev -H "Content-Type: application/json" -H "Origin: http://localhost:3000" -d '{"email":"dev@local"}'` e depois `curl -s -b /tmp/sid http://localhost:3000/api/shelf`. [server/auth.ts, tests/api.test.ts, inferido]

## Alternativa
— (sem Docker no repo). [ls]

## Estado
`data/estante.db` (+ `-wal`/`-shm`), ignorado pelo git; `stop` não apaga nada. Estado descartável: `DATABASE_PATH=/tmp/<arquivo>.db`. [.gitignore, server/env.ts]

## Credenciais de dev
Botão "Entrar sem Google" (`POST /auth/dev`) com `ALLOW_DEV_LOGIN=true` e fora de produção. Google OAuth opcional: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`BASE_URL`. Anúncios: `ADS_ENABLED=true` + `AD_PROVIDER=simulated`. Sem Swagger/admin. [.env.example, server/env.ts]

## Sinais
`ExperimentalWarning` do `node:sqlite` ao subir → aviso, ignorar. [README.md]
`dist/client não encontrado` no `npm start` → rodar `npm run build`. [server/index.ts]
`EADDRINUSE` em 3000/5173 → processo antigo vivo; `fuser -k <porta>/tcp`. [inferido]
Login dev não aparece → `ALLOW_DEV_LOGIN` ausente ou `NODE_ENV=production`/build compilado. [server/env.ts]
Lockfile mudou → `npm install` antes. [padrão]
