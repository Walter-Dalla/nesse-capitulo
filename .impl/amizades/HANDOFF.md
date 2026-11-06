# Handoff · amizades · 2026-11-06

Tarefa `/wh:implementation` interrompida depois da fase 2, para continuar no Claude Code web. Nenhum código de produto foi escrito.

Pedido do dono: sistema de adicionar amizades para acompanhar o que os amigos estão lendo, e badge dos livros que amigos já leram, validado depois de adicionar o livro à estante, não na pesquisa.

## Estado
- Fase 1 (ambiente): feita. Base: `main` @ eacf10e.
- Fase 2 (enriquecer): feita. Todas as perguntas ao dono respondidas; decisões em `PLANO.md`.
- Fases 3 a 6: nada iniciado. A branch `impl/amizades` não existe.

## Próximo passo
1. Criar `impl/amizades` a partir de `main`, sem os arquivos de `.impl/` (esta branch de handoff só carrega o plano; não entra no PR).
2. W1: faixa `servidor` (`servidor.md`, itens amizades-1 a 4). Depois QA de código e merge na `impl/amizades`.
3. W2: faixa `cliente` (`cliente.md`, itens amizades-5 a 9). Mesmo fluxo.
4. QA final com os cenários de `PLANO.md`, relatório, docs de fim (notas no fim de `PLANO.md`) e PR contra `main`.

## Arquivos
- `PLANO.md`: decisões, itens, Aceites, ondas, cenários de QA, notas de docs.
- `ANALISE.md`: arquitetura, schema, contrato, privacidade, custo do badge.
- `servidor.md`, `cliente.md`: instruções de cada faixa, com o contrato.
- `QUADRO.md`: quadro das faixas, vazio.
- `proto/match.mjs`: protótipo do casamento usado nas medições.

## Avisos
- O enriquecedor morreu com a sessão local: dúvida se resolve por `ANALISE.md` e `PLANO.md`, anotando a resposta em Decisões.
- Aceites da ponta medidos em `main` @ eacf10e: itens 2 a 9 vermelhos; amizades-1 é refactor e fica verde (13 pass). `main` pode ter andado; confira antes de disparar a W1.
- `.impl/` está no `.git/info/exclude` do clone local; aqui os arquivos entraram com `git add -f`.
- `.claude/perfil/_comum.md` § Navegação diz que `.codegraph/` não existe, mas o clone local tem índice. O índice não é versionado: no web, sem ele, use `grep`/`Read`.
- Portas da faixa (3101, 3102) vêm do perfil do clone local; no web, use a primeira livre.
