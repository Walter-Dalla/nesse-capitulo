# Perfil do /wh:implementation

## Build
`npm run build 2>&1 | tail -30` (Vite + `tsc -p server/tsconfig.json`; gera `dist/client` e `dist/server`). [package.json]

## Testes
Armadilha: `node --test` sai 0 quando nenhum teste casa com `--test-name-pattern` e quando recebe arquivo inexistente junto de um existente. Aceitação = arquivo de teste novo, sozinho na 1ª chamada. [retros i18n-pt-en-es]
Área: `node --test --import tsx --test-name-pattern "<filtro>" tests/*.test.ts` (filtro = trecho do nome do `test("…")`). [package.json, inferido]
Suíte: `npm test 2>&1 | grep -E "^# (pass|fail)|not ok"`. [package.json]
Aceite de item = teste de área que só fica verde com o item feito; teste novo em `tests/<area>.test.ts` quando não há. Banco em memória: `createApp(openDatabase(":memory:"))`; login dev por `POST /auth/dev` com `ALLOW_DEV_LOGIN=true`, `NODE_ENV=test`. [tests/api.test.ts]
Relógio e aleatoriedade: não injetados; — [inferido]

## Checks
`npm run typecheck` (front, server e tests) — por item e QA final. [package.json, ci: ci.yml]
Lint/formatação: — (não há ESLint/Prettier no repo). [package.json]

## Serviço descartável
Subir: `npm run build && PORT=<porta> DATABASE_PATH=/tmp/estante-<slug>.db ALLOW_DEV_LOGIN=true NODE_ENV=development BASE_URL=http://localhost:<porta> node dist/server/index.js > /tmp/estante-<slug>.log 2>&1 &` (serve API + front na mesma porta). [server/index.ts, server/env.ts, confirmado pelo dono]
Health: `curl -s http://localhost:<porta>/api/health` → `{"ok":true}`. [server/app.ts]
Parar: `fuser -k <porta>/tcp`. Fixtures: — (banco nasce vazio; login dev cria o usuário). [confirmado pelo dono]
Portas: `_comum § Portas`.

## Contrato
Rotas `/api/*` e `/auth/*` e seus JSON (`README § API`, tipos em `server/types.ts` espelhados em `client/src/lib/types.ts`); schema SQLite em `server/db.ts`. [README.md, server/types.ts]
Sem snapshot/golden file: contrato é verificado pelos testes de `tests/api.test.ts` e pelo `typecheck` dos dois lados; mudança de rota ou campo exige atualizar `README § API`, `server/types.ts`, `client/src/lib/types.ts` e `client/src/lib/api.ts`. [inferido]

## Arquivos de união
`server/app.ts` (registro de rotas) `server/db.ts` (schema) `client/src/App.tsx` (rotas do front) `client/src/lib/api.ts` `client/src/lib/types.ts` `server/types.ts` `.env.example`. [confirmado pelo dono]

## Arquivos protegidos
`CLAUDE.md`, `.claude/perfil/*`, `docs/GLOSSARIO.md`, `docs/features/*`, `docs/MONETIZACAO.md`, `README.md`, `docs/relatorios/*`. [adotar, confirmado pelo dono]

## Leitura do enriquecedor
Sempre: `CLAUDE.md`, `README § API` e `§ Regras`, `docs/features/README.md`, `docs/GLOSSARIO.md`. [adotar]
Só quando toca a área: `docs/MONETIZACAO.md` (criação de livros, anúncios); `client/public/` e `README § Play Store` (PWA/TWA). [CLAUDE.md]
Índices de código: `codegraph explore` se `.codegraph/` existir; senão `server/app.ts` e `client/src/App.tsx` antes de qualquer grep. [_comum § Navegação]

## QA visual ou e2e
`/wh:qa-visual <áreas> --autonomo` contra o serviço descartável na porta do QA final (login via botão "Entrar sem Google"). Relatório em `docs/relatorios/`. Sem Playwright no repo. [confirmado pelo dono]

## Docs de fim
Changelog: —. Status de features: —. Pendências do dono: —. Convenções: —. [ls]
Glossário: `docs/GLOSSARIO.md`. Mapa de features: `/wh:feature-docs`. Limpeza: `/wh:limpeza`. [adotar]

## Relatório
`docs/relatorios/<data>-<slug>.md`. [padrão]

## Modelos
— [padrão da skill]

## Comandos na worktree
`npm ci --no-audit --no-fund` uma vez, antes da 1ª Aceitação (worktree nasce sem `node_modules`). git só por caminho absoluto: `<git> -C <worktree> …`, um comando por chamada; `-C .` é recusado. [retros i18n-pt-en-es]
