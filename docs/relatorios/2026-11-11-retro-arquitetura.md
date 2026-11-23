# Retro: levantamento de arquitetura (`docs/architecture/`)

Sessão de 2026-11-11: engenharia reversa do repositório para o modelo C4 + Mermaid, no commit `2487705`. Candidatos a melhorar o ambiente do agente, em ordem de severidade. Nada foi aplicado.

| # | Sev. | Categoria | Evidência | Proposta | Quem aplica |
| --- | --- | --- | --- | --- | --- |
| 1 | Alta | Acesso à informação | `npx @mermaid-js/mermaid-cli` falhou nos 8 diagramas: `~/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.50` existe vazia e `puppeteer browsers install` a recria vazia e falha. Custou 5 chamadas e um download manual de 122 MB para o scratchpad. | Consertar o cache uma vez (`npx puppeteer browsers clear` e reinstalar, investigando por que o install falha) ou definir `PUPPETEER_EXECUTABLE_PATH` para um Chrome fixo no perfil do shell. | Dono, fora do repo |
| 2 | Média | Economia de ferramenta | A saída condensada do RTK escondeu o diagnóstico: `find ~/.cache/puppeteer` voltou vazio e o erro do install veio só como stack trace, sem a causa. Só `rtk proxy` mostrou a mensagem "executable is missing". Duas chamadas perdidas. | Em `~/.claude/RTK.md`, acrescentar que diagnóstico de erro (stderr de instalador, `find` em cache) já sai com `rtk proxy`; ou ajustar o filtro do RTK para não cortar a linha `Error:` antes do stack. | Dono, fora do repo |
| 3 | Média | Check automático | `ARCHITECTURE.md` e `preview.html` são derivados de `architecture.json` + `.mmd` por um script que ficou no scratchpad da sessão; a validação do contrato (ids en/pt, evidências `arquivo:linha`, ausência de estilo) também. Sem isso no repo, os derivados e as evidências envelhecem a cada mudança de código sem ninguém notar. | Mover o gerador/validador para o repo (ex.: `scripts/architecture.mjs`), com `npm run docs:architecture` e um passo no `ci.yml` que falha se a evidência apontar para linha inexistente ou se os derivados estiverem defasados. | Repo |
| 4 | Baixa | Acesso à informação | `explorer.exe` não está no PATH do shell do WSL; a primeira instrução para abrir o `preview.html` falhou e custou uma ida e volta com o dono. | Uma linha no `~/.claude/CLAUDE.md`: abrir arquivo no Windows com `/mnt/c/Windows/explorer.exe "$(wslpath -w <arquivo>)"`. | Dono, fora do repo |
| 5 | Baixa | Navegação | `CLAUDE.md` § "Onde mora cada camada" não cita `Dockerfile`, `compose.yaml` nem `deploy/`; foram achados por `ls`. O § Docs também não aponta para `docs/architecture/`. | Duas linhas de ponteiro no `CLAUDE.md` do repo: implantação (`Dockerfile`, `compose*.yaml`, `deploy/`) e `docs/architecture/`, com o aviso de que `architecture.json` é a fonte. | Repo |
| 6 | Baixa | No-op | O hook `wh:prompt-graph` injetou ponteiros de idioma, estante e conta e o aviso sobre "biblioteca" numa tarefa de arquitetura: casou com palavras soltas do prompt colado (inclusive "biblioteca" como tipo de sistema). Não mudou o trabalho. | No hook, não casar termos do glossário dentro de `<pasted_content>`, ou exigir mais de um termo antes de injetar features. | Dono, harness `wh` |

## O que funcionou

- Uma chamada ao CodeGraph deu o esqueleto do servidor (`server/app.ts`, `server/index.ts`, `server/db.ts`).
- O `README.md` já trazia rotas e regras, o que encurtou o levantamento.
