# Melhorias do HAR de produção · 2026-11-09 · impl/har-melhorias · PR no GitHub

Pedido: aplicar as melhorias achadas no HAR de produção (nesse-capitulo.walterdalla.uk), confirmando cada uma no código atual. Das 6, 4 valiam em `main`: o service worker revalidava toda capa a cada exibição, a tela Anos abria no ano atual mesmo vazia, o servidor não mandava CSP e nenhum chunk lazy era pré-carregado. Descartados: `Cache-Control` no HTML (já `no-cache` desde `53ee6d4`) e `read` com `readYear` 2009 e `startedAt` 2026 (segue `README.md` § Regras). Redeploy registrado em `docs/PENDENCIAS.md`.

Lanes:
- `cache-headers`: har-melhorias-1 `cf904ed` (capas: OL por id nunca revalida; ISBN e Google a cada 30 dias, data em `estante-covers-meta`), -2 `9e3b606` (CSP em `server/app.ts`), -3 `c7322f3` (pendência de redeploy).
- `telas`: har-melhorias-4 `f5701aa` (Anos abre no ano mais recente com livros), -5 `dc43542` (preload em idle de Search, BookDetail, Years e AddSheet), -6 `8fda370` (`docs/MONETIZACAO.md`: estender a CSP ao ativar AdSense).

## Errors
Nenhum na ponta: `npm test` 366 pass / 0 fail, typecheck 0, build 0 em `6c9d8ca`. Merges `a037409` e `591ff18` sem conflito.

## Open items
- Decisões do dono: CSP só com o que roda hoje (AdSense exige estender a CSP; passo em `docs/MONETIZACAO.md`). TTL de capa 30 dias (recomendado era 7).
- Desvio aceito em Anos: se `/api/stats` falha sem `?ano=`, cai no ano atual; o ano resolvido é gravado na URL com `replace` (QA-telas-01).
- Produção continua anterior a `821ad8b`: o deploy é do dono (`docs/PENDENCIAS.md`). Após o deploy, conferir no navegador que as capas por id carregam sem violação de CSP.
- Contratos: nenhum mudou. Cabeçalho novo `content-security-policy` em toda resposta.
- Sem perfil `qa-visual` em `.claude/perfil/`; a QA final rodou Playwright à mão.

## QA
Código:
- QA-telas-01 (risco, baixo): o ano podia mudar num refetch. Corrigido em `c2add55`.
- QA-telas-02 (risco, baixo): `import()` do preload sem `.catch`. Corrigido em `710301b`.
- QA-cache-headers-01 (risco, baixo): `*.googleusercontent.com` em `connect-src`. Corrigido em `9040481`.
- QA-cache-headers-03 (teste faltando): `clearBookCaches` apaga `estante-covers-meta`. Corrigido em `1d3fe3d`.
- QA-cache-headers-02 (checagem no navegador): feita na QA final.

Final:
- QA-final-01 (bug, alto): a CSP bloqueava toda capa da Open Library por id. O redirect passa pelo host `archive.org` sem subdomínio, que `*.archive.org` não cobre. Corrigido em `6c9d8ca` e retestado no navegador, com e sem SW: 3 tipos de capa carregam, 0 violações.
- Também conferidos: páginas legais e landing estilizadas, preload dos chunks, `/anos?ano=2024` com Voltar para `/`.

## Problems found
Nenhum fora do escopo.

## Consolidated retro
| # | Severity | Category | Evidence (lanes) | Proposal | Who applies |
|---|---|---|---|---|---|
| 1 | high | check / análise | QA-final-01: `*.archive.org` sem o host nu, mesmo com o HAR listando `archive.org`; teste de string fixou o erro (enricher, qa-final, orchestrator) | Perfil § Testes: cada host de redirect literal, teste host a host (**aplicado**); harness: checklist do enricher para allowlists | repo (aplicado) / harness |
| 2 | medium | verificação | Checagem no navegador sem forma executável na lane (cache-headers, enricher) | Harness: item cujo efeito só aparece no navegador leva QA visual para a Aceitação ou fica com `WARNING` até a QA | harness |
| 3 | medium | ferramenta | `Write` recusado para `ANALYSIS.md` e para a saída da QA de código; heredoc ou orquestrador escreveu (enricher, orchestrator) | Prompts de impl-enrich e impl-qa: heredoc como caminho padrão | harness |
| 4 | medium | perfil | Perfil em `.claude/perfil/` com nomes em português; a skill esperava `.claude/profile/` (orchestrator) | Harness lê `.claude/perfil/` ou o repo renomeia | dono |
| 5 | medium | instruções | Aceitação encadeada com `> log` só gravava o último comando; guard recusou `{ …; }` (cache-headers, telas) | `impl-dev`: `acceptance.py --log` como caminho padrão | harness |
| 6 | low | teste / perfil | Import literal de módulo DOM quebra o typecheck dos tests (cache-headers); sem perfil `qa-visual` (qa-final); `acceptance.py` com SyntaxWarning (telas); servidor não expõe o commit em produção (enricher) | Perfil § Testes (**aplicado**); `/wh:profile qa-visual`; `r"""` em `acceptance.py`; `/api/health` com commit | repo / harness / dono |
