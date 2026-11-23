# Retro: atualização da arquitetura para o schema 2 (`docs/architecture/`)

Sessão de 2026-11-11: revisão do levantamento anterior e reescrita no contrato novo (schema 2, orquestração por subagentes, `build.mjs`), no commit `2487705`. Candidatos a melhorar o ambiente do agente, em ordem de severidade. Nada foi aplicado. Continua a retro de `2026-11-11-retro-arquitetura.md`.

| # | Sev. | Categoria | Evidência | Proposta | Quem aplica |
| --- | --- | --- | --- | --- | --- |
| 1 | Alta | Economia de ferramenta | A Fase B do prompt manda um subagente por diagrama. Foram 6 subagentes (cerca de 320 mil tokens) para traduzir listas que o orquestrador já tinha fechado nó a nó em `spec.md`; cada um escreveu de 14 a 37 linhas. | No prompt: subagente por diagrama só na extração completa ou acima de um tamanho (ex.: mais de 15 nós). No modo atualização, o orquestrador escreve os `.mmd` e um único subagente traduz para pt. | Dono, prompt fora do repo |
| 2 | Alta | Acesso à informação | `npx -y @mermaid-js/mermaid-cli` falhou de novo ao iniciar o navegador do Puppeteer (mesmo defeito da retro anterior, nº 1). Segunda sessão seguida que entrega "sintaxe não validada" e depende de o dono abrir o `preview.html`. | Consertar o cache do Puppeteer ou fixar `PUPPETEER_EXECUTABLE_PATH`; ou tirar a tentativa do prompt e assumir o `preview.html` como única checagem de sintaxe. | Dono, fora do repo |
| 3 | Média | Check automático | `build.mjs --check` valida 96 evidências `arquivo:linha`, ids en/pt e derivados, mas não roda em lugar nenhum: `.github/workflows/ci.yml` só tem typecheck, test e build. Qualquer refatoração desloca linhas em silêncio. | Um passo em `ci.yml`, depois do build: `node docs/architecture/build.mjs --check`. | Repo |
| 4 | Média | Doc de direção | O prompt chegou duas vezes com `<CAMINHO DO BUILD.MJS CANÔNICO>` sem preencher, e pede "pare e aguarde meu ok" com perguntas; o ok veio sem as 7 respostas, e o agente teve de escolher padrões (repositório vazio, TLS como hipótese, risco `open`). | Preencher o caminho canônico (o `build.mjs` desta sessão serve de base) e dizer no prompt qual é o padrão de cada pergunta quando não houver resposta. | Dono, prompt fora do repo |
| 5 | Média | Acesso à informação | Onde o TLS termina não está escrito em nenhum arquivo; host e túnel só aparecem em `.claude/profile/deploy.md` e `docs/PENDENCIAS.md`, que têm dados que não podem ir a público. Resultado: uma hipótese em aberto e evidências fracas no trecho borda → túnel. | Uma seção curta e publicável de implantação no `README.md` (borda, túnel, onde o TLS termina, host único, volume), sem endereços. | Repo, com fatos do dono |
| 6 | Baixa | No-op | O hook `wh:prompt-graph` injetou glossário e features em cada retorno de subagente e notificação de tarefa (mais de dez vezes), casando palavras do relatório do subagente. Não mudou nenhuma decisão. | No hook, ignorar mensagens que não são do usuário (hand-back de subagente e `task-notification`). | Dono, harness `wh` |

## Observações

- O subagente de evidências devolveu linhas aproximadas em `server/routes/shelf.ts` e `server/routes/moderation.ts` (desvios de 2 e 10); custou uma chamada de reconferência. Pedir no briefing a saída de `grep -n` como texto literal evita isso.
- A conferência por um subagente que não escreveu achou 8 evidências fracas e 2 afirmações imprecisas (revalidação de capas, alcance do CSRF). Vale manter essa fase.
- Pendente da retro anterior: `CLAUDE.md` ainda não aponta para `docs/architecture/` nem para `Dockerfile`, `compose*.yaml` e `deploy/`.
