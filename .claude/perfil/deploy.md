# Perfil do /wh:deploy

## Alvo
Hoje: Docker local no WSL do dono, `http://localhost:8080` (porta via `ESTANTE_HOST_PORT`), orquestrado por `compose.yaml` na raiz do checkout. Produção: Stack `estante` no Komodo do homelab, modo UI Defined (compose colado na UI = `deploy/compose.prod.yaml`), imagem do zot. URL pública e servidor: —. [dono]
Teste local com login dev: `compose.yaml` + `compose.local.yaml` (NODE_ENV=development, `ALLOW_DEV_LOGIN=true`). Nunca usar o override no alvo de produção. [compose.local.yaml]

## Acesso
Alvo local: o agente roda `docker`/`docker compose` neste WSL, com confirmação do dono antes de recriar o container. Servidor remoto: nenhum acesso. [inferido]

## Artefato
Imagem Docker `estante` (multi-stage `Dockerfile`, `node:24-slim`, roda como `node`, `dist/` + deps de produção). Tags: `sha-<commit curto>`, `latest`, e `<versão>` opcional. [Dockerfile, deploy/publish.sh]
Registro: zot do dono em `http://192.168.1.40:5900` (HTTP, sem auth; já em `insecure-registries` do Docker Desktop). Imagem `192.168.1.40:5900/estante`. Publicar com `REGISTRY=192.168.1.40:5900`. Tags: `curl -s http://192.168.1.40:5900/v2/estante/tags/list`. [dono, docker info]
Fora da imagem: `.env`, `data/`, `.git`, `docs/`, `.claude/` (`.dockerignore`). [.dockerignore]

## Pré-condições
Árvore commitada (o script recusa árvore suja): `git status --porcelain` vazio. Commit/push: `_comum § Git`. [deploy/publish.sh]
Daemon vivo: `docker version --format '{{.Server.Version}}'` e `docker compose version`. [inferido]
Porta do alvo livre ou ocupada pelo próprio container: `docker compose ps`; `fuser 8080/tcp`. [compose.yaml]
Registro alcançável: `curl -s -o /dev/null -w "%{http_code}" http://192.168.1.40:5900/v2/` → `200`. [dono]

## Publicar
`REGISTRY=192.168.1.40:5900 deploy/publish.sh [versão]`: `npm test`, `docker build`, tags, push se `REGISTRY`. ~1–2 min (cache quente: segundos). Log no scratchpad; filtrar `grep -E "^RESULT:|^ERRO:|not ok|ERROR"`. [deploy/publish.sh]
Repush sem rebuild: `REGISTRY=192.168.1.40:5900 deploy/publish.sh --push-only`. [deploy/publish.sh]

## Atualizar
Local (agente): `ESTANTE_IMAGE=192.168.1.40:5900/estante IMAGE_TAG=sha-<commit> docker compose up -d` (produção) ou `docker compose -f compose.yaml -f compose.local.yaml up -d --build` (teste com login dev). Pronto quando `docker compose ps` mostra `(healthy)` (HEALTHCHECK em `/api/health`). [compose.yaml, Dockerfile]
Produção (dono): Stack `estante` no Komodo com Poll For Updates + Auto Update redeploya quando `latest` muda no zot; senão botão Deploy. Fixar versão: `IMAGE_TAG=sha-<commit>` no Environment da Stack. `deploy/compose.prod.yaml` mudou → dono cola o conteúdo novo na Stack. [dono]
Segredos/variáveis do alvo: no `.env` ao lado do `compose.yaml` (local) ou no Environment da Stack com `[[SECRET]]` do Komodo (produção) (interpolação do compose; nomes em § Segredos). [compose.yaml]

## Verificar
`curl -s http://localhost:8080/api/health` → `{"ok":true}` (API e SQLite no ar). [server/app.ts]
`curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/` → `200` (SPA servida de `dist/client`). [server/index.ts]
`curl -s http://localhost:8080/api/me` → `{"user":null,...}` sem cookie (sessão/rotas montadas). [README.md, inferido]
Só com `compose.local.yaml`: `POST /auth/dev` com `Origin: http://localhost:8080` → usuário; depois `GET /api/shelf` com o cookie → `{"items":[...]}`. Nunca em produção. [server/auth.ts]
Nunca chamar em produção: `POST /api/shelf` (cria dados), `/auth/google*`. Logs: `docker compose logs --tail 100 estante`. [inferido]

## Falhas
`unhealthy` / exit logo ao subir → `docker compose logs estante`; `dist/client não encontrado` = build quebrado, rodar `npm run build` local para ver o erro. [server/index.ts]
`EADDRINUSE`/`port is already allocated` em 8080 → outro processo; `ESTANTE_HOST_PORT=<porta>`. [inferido]
`SQLITE_CANTOPEN`/permission denied em `/app/data` → volume criado como root; o dono decide recriar o volume (perde dados). [Dockerfile, inferido]
"Entrar sem Google" ausente → subiu sem `compose.local.yaml` (correto em produção). [server/env.ts]
Login Google volta com erro → `BASE_URL`/`ESTANTE_BASE_URL` diferente do redirect URI cadastrado. [.env.example]
`http: server gave HTTP response to HTTPS client` → `192.168.1.40:5900` saiu de `insecure-registries` (Docker Desktop → Settings → Docker Engine). `denied` → zot ganhou auth; `docker login 192.168.1.40:5900` pelo dono. [inferido]

## Rollback
`IMAGE_TAG=sha-<commit anterior> docker compose up -d` (com confirmação). Tags: `curl -s http://192.168.1.40:5900/v2/estante/tags/list` ou `docker images estante --format '{{.Tag}} {{.CreatedSince}}'`. Rollback não volta o volume `estante-data`. [compose.yaml]

## Backup
Volume `nesse-capitulo_estante-data` (SQLite em WAL). Cópia consistente: `docker compose exec estante node -e "new (require('node:sqlite').DatabaseSync)('/app/data/estante.db').exec(\"VACUUM INTO '/app/data/backup.db'\")"` e `docker compose cp estante:/app/data/backup.db ./backup-<data>.db`. Sem agendamento. Nunca `docker compose down -v`. [inferido]

## Segredos
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google Cloud Console → Credenciais), `GOOGLE_BOOKS_API_KEY`, `ADSENSE_CLIENT_ID`, `ESTANTE_BASE_URL`: no `.env` do alvo, nunca lidos pelo agente. [.env.example, compose.yaml]

## Configurações externas
Google OAuth: redirect `${BASE_URL}/auth/google/callback`. `client/public/.well-known/assetlinks.json` precisa do SHA-256 da TWA (Play Store). [README.md]

## Clientes extras
Android TWA via Bubblewrap a partir do manifest público (`README.md` § Play Store); requer deploy HTTPS. [README.md]

## Setup inicial
Local: Docker Desktop/Engine no WSL; `docker compose -f compose.yaml -f compose.local.yaml up -d --build` (feito 2026-11-04). Produção: —. [inferido]
