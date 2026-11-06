# Pendências

Levantadas em 2026-11-06, no deploy em produção e no diagnóstico do `/wh:adotar`.

## Deploy em produção

- [ ] Adicionar o bloco `networks` de `deploy/compose.prod.yaml` à Stack `estante` no Komodo e fazer **Deploy**. Sem ele, `https://nesse-capitulo.walterdalla.uk` responde `502`.
- [ ] Redeployar a Stack do cloudflared, se a entrada de `nesse-capitulo.walterdalla.uk` foi adicionada depois do último deploy dela: o container só lê o `config.yml` ao iniciar.
- [ ] Testar pelo túnel: `/api/health`, `/auth/providers` e o redirect de `/auth/google`.
- [ ] Testar o login Google de ponta a ponta. O redirect cadastrado precisa ser `https://nesse-capitulo.walterdalla.uk/auth/google/callback`.
- [ ] Confirmar que o app OAuth foi publicado em **Público-alvo**. Em modo de teste, só entra quem estiver na lista de test users.
- [ ] Commitar `deploy/compose.prod.yaml` e `.claude/perfil/deploy.md`.

## Perfis do harness

- [ ] Confirmar as 15 linhas `[inferido]`: `deploy` 7, `_comum` 5, `implementation` 2, `start-app` 1.
- [ ] Reduzir `.claude/perfil/deploy.md` de 61 para no máximo 60 linhas. O excesso vira doc do repo.
- [ ] Corrigir `.claude/perfil/_comum.md:36`: diz "Produção: nenhuma URL ou servidor no repo", mas a URL pública agora é `https://nesse-capitulo.walterdalla.uk`.
- [ ] Decidir se preenche as seções `—`: `_comum` (Clone) e `implementation` (Modelos, Comandos na worktree).

## Só se forem usados

- [ ] Perfis opcionais ausentes, criados com `/wh:perfil <skill>`: `brainstorm`, `feature-docs`, `limpeza`, `qa-visual`.
- [ ] `.impl/` ainda fora do `.git/info/exclude`. O `/wh:implementation` resolve na primeira execução.
