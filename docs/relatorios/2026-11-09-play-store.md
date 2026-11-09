# Requisitos da Google Play · 2026-11-09 · impl/play-store · PR no GitHub

Pedido: implementar o que a Google Play exige do Estante (TWA), com pesquisa web do que faltava, e depois fazer o deploy. Apple fora do escopo.
Entregue: páginas públicas de política, termos e exclusão de conta (PT/EN/ES); exclusão de conta no app; aceite de termos; denúncia, bloqueio, moderação e banimento dos comentários públicos; atribuição e links do Google Books; botão Google no padrão; contato no User-Agent.
Pesquisa: `PESQUISA.md` (resumos de modelo das páginas oficiais; "inferência"/"não confirmado" são do pesquisador).

Lanes (18 itens, 3 ondas, base `17993f8`):
- W1 `legal` (1-5): `7052cf8` `b402a0b` `934d187` `4941dfb` `b7c7684` + QA `f8123fc` `0520986`
- W1 `conta` (6-8): `3b6678d` `2f86788` `2e96c3f` `798ec54`
- W2 `catalogo` (12-14): `39ac8ec` `8e5021a` `713690a` + QA `d3ce2b3` `b392401` `d1876e1`
- W2 `social` (9-11): `7f5a237` `146dbb5` `2f00373` + QA `1b11f38` `965847e` `03e185c`
- W3 `telas` (15-18): `0f59853` `53d0703` `f4c6bf3` `559f07a` + QA `e560f6e` `8ef9abe`
- QA final: `b1d67f9`

## Errors
- Nenhuma falha restante: `npm test` 350/0, `npm run typecheck` 0, `npm run build` 0 sem aviso.
- Conflito: `impl: legal` × `impl: conta` em `server/app.ts` (imports `accountRoutes`/`legalRoutes`); mantidos os dois (`8ea91bd`).
- `play-store-6` (migração que apaga livro manual órfão) quebrou `tests/api.test.ts:253`, que usava esse livro como fixture; trocado por livro `google` (`798ec54`).

## Open items
Pendências do dono, **antes do `/wh:deploy`** (também em `docs/PENDENCIAS.md`):
- **O1 revisão legal** de `/privacidade`, `/termos`, `/excluir-conta`: rascunho. Idade mínima 13 (dados de adolescentes têm regra própria na LGPD); base legal e direitos do titular não pesquisados na ANPD.
- **O2 backup:** o texto afirma "dados podem ficar em backups por até 30 dias", mas `.claude/perfil/deploy.md § Backup` diz "Sem agendamento". Garantir que nenhuma cópia passa de 30 dias, ou ajustar a chave `backupRetention` em `server/legalText.ts`.
- **Anúncios:** as páginas dizem que não há anúncios (`serviceNone`). Manter `ADS_ENABLED=false`; antes de ligar, perguntar ao suporte AdSense (elegibilidade da Ad Placement API e gate que bloqueia criar livro), adicionar CMP/consentimento e mudar o texto (QA-legal-01).
- **Console da Play:** URL da política `https://nesse-capitulo.walterdalla.uk/privacidade`, URL de exclusão `…/excluir-conta`, Data safety (agora com denúncias, bloqueios e data de aceite), classificação com UGC, `.aab` com API 36, `package_name` e SHA-256 reais em `client/public/.well-known/assetlinks.json` (hoje `com.example.estante`), teste fechado, verificação de desenvolvedor, verificação de domínio/marca OAuth.
- **Banco de produção:** checagem única de que nenhum outro usuário tem o e-mail `walterdallaprofissional@gmail.com` (QA-social-05; contas antigas guardaram e-mail sem checar `email_verified`).
- **Banido e exclusão** (QA-social-03): banido não entra, então só exclui por e-mail (caminho descrito em `/excluir-conta`). Aceito por ora.

Contratos mudados (deploy único, servidor e cliente na mesma imagem):
- Rotas novas: `GET /privacidade` `/termos` `/excluir-conta`; `DELETE /api/account`; `POST /api/terms/accept`; `POST /api/reports`; `POST /api/friends/:userId/block`, `GET /api/friends/blocks`, `DELETE /api/friends/blocks/:userId`; `GET /api/mod/reports`, `POST /api/mod/reports/:id/resolve`.
- `GET /api/me` + `termsAccepted`, `isModerator`. Erros novos `TERMS_REQUIRED`, `REPORT_INVALID`, `ACCOUNT_BANNED`.
- Schema aditivo: `users.terms_version`, `terms_accepted_at`, `banned_at`; tabelas `content_reports`, `user_blocks`; gatilho `trg_user_books_manual_orphan`; `migrate` apaga livros manuais órfãos existentes (único passo destrutivo: só linhas sem dono). Rollback: imagem antiga lê o banco; banido voltaria a entrar.
- `tests/api.test.ts` fixture ajustada (ver Errors).

Decisões do dono (todas com o dono): anúncios desligados; comentários públicos mantidos com moderação; tela `/moderacao`; contato e moderador `walterdallaprofissional@gmail.com`; idade 13; resposta a pedido por e-mail em até 30 dias. Nenhuma sem o dono.

Não coberto pelo QA visual: OAuth Google ao vivo e busca ao vivo (APIs externas proibidas em teste); rodapé "via Open Library" na tela.

Riscos só registrados (pesquisa "não confirmado"): sinopse do Google Books gravada para sempre em `books.description` (item 38); cobrar pelo app exige acordo com o Google Books, afeta a ideia "Estante Plus" (item 37).

## QA
Decisões contestadas pelo QA de código: nenhuma.

| Achado | Tipo · sev. | Desfecho |
|---|---|---|
| QA-conta-01/02 | name/standard · low | glossário e README § API: fase de docs |
| QA-legal-01 | risk · low | registrado: frase "sem anúncios" (ver Open items) |
| QA-legal-02 | name · low | `f8123fc` ("expulsada" em ES) |
| QA-legal-03 | missing test · low | `0520986` |
| QA-catalogo-01 | standard · medium | `d3ce2b3` "Powered by Google" com Open Library vazio; retestado |
| QA-catalogo-02 | risk · low | `b392401` cache guarda o provedor; retestado |
| QA-catalogo-03 | missing test · low | `d1876e1`; retestado |
| QA-social-01 | missing test · low | `1b11f38` |
| QA-social-02 | risk · low | `965847e` `remove_comment` sem comentário → 400 |
| QA-social-03 | product judgment · low | registrado (Open items) |
| QA-social-04 | standard · low | `03e185c` |
| QA-social-05 | risk · low | registrado (Open items) |
| QA-telas-01 | standard · low | `e560f6e` |
| QA-telas-02 | risk · low | `8ef9abe` folha de exclusão cita livros manuais |
| QA-telas-03 | missing test · low | coberto no QA visual (cenário 1 ok) |
| QA-final-01 | bug · low | `b1d67f9` código `ACCOUNT_BANNED` no 403 de login banido |

QA visual (Playwright ad hoc, 360 px, 9 cenários): todos ok depois de QA-final-01. Relatório e telas em `.impl/play-store/qa/visual/` (apagados na limpeza; nenhum bug aberto).

## Problems found
Nenhum fora do escopo além dos riscos dos itens 37 e 38 acima.

## Consolidated retro
| # | Severity | Category | Evidence (lanes) | Proposal | Who applies |
|---|---|---|---|---|---|
| 1 | high | Information access | orquestrador: `git checkout main` desviou o merge de outra sessão (`0a225fe`) no checkout compartilhado | `_comum.md § Git`: checar `ListAgents` e `git branch --show-current` antes de trocar branch; tarefa longa em worktree própria | dono |
| 2 | high | Tool economy | enricher (analyze), todos os QAs: `Write` recusado em `.impl/`; orquestrador reescreveu 5 arquivos a partir do handback | wh: impl-qa e impl-enrich escrevem por heredoc, ou ENVIRONMENT.md diz que o orquestrador grava | dono (harness) |
| 3 | high | Navigation | qa-final: sem perfil `qa-visual`, Playwright improvisado no scratchpad; `Origin` exigido em `/auth/dev`; busca e detalhes precisam de fixture de rota | `/wh:profile qa-visual` com local do Playwright, `Origin`, fixtures de `/api/search` e `/api/shelf/*/details` | dono |
| 4 | medium | Code standard | enricher, QA-final-01: 403 sem `code` vira texto genérico no cliente | teste que varre `c.json({ error }, 4xx)` sem `code` (lista de exceções) | repo |
| 5 | medium | Steering doc | enricher, social, telas, QA-catalogo: plano sem caso vazio/alvo ausente (cache, `remove_comment`), sem índices, sem dono para linha existente de arquivo de união (`Api.me`), fixture de `migrate` fora do `May touch` | wh enricher: checklist (vazio/erro, alvo apagado, índices de FK, grep de fixtures em `tests/`, exceção de união explícita) | dono (harness) |
| 6 | medium | Automatic check | legal, conta, orquestrador: horários do board digitados à mão | wh impl-dev: `date -u` em toda linha do board | dono (harness) |
| 7 | low | Navigation | orquestrador: skill espera `.claude/profile/`, repo usa `.claude/perfil/` | renomear ou a skill aceitar os dois | dono |
| 8 | low | Automatic check | conta, telas, social: suíte só no fim após mudar `db.ts`; exit do typecheck escondido por `| tail`; `deepEqual` com linha de `node:sqlite`; ids Google falsos para o botão | `.claude/perfil/implementation.md` § Testes, § Checks, § Serviço descartável | **aplicado** neste commit |
| 9 | low | Steering doc | telas, catalogo: testes de `.tsx` por regex frágeis (`[^>]*` com `=>`) | perfil § Testes ou QA visual como prova de tela | repo |
| 10 | low | Information access | orquestrador: `docs/PENDENCIAS.md` dizia 502 em produção (estava 200) | fechado na fase de docs | repo (feito) |
| 11 | low | Steering doc | enricher: pesquisa citava só "Continue with Google"; página oficial aceita "Sign in with Google" | conferir na página oficial requisito que muda texto visível | dono (harness) |
| 12 | low | Automatic check | qa-final: pasta `qa/` aparecia como não rastreada na worktree | `qa/` no `.gitignore` | repo |
