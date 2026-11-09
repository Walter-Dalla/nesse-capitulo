# Pendências

Levantadas em 2026-11-06, no deploy em produção e no diagnóstico do `/wh:adotar`.

## Deploy em produção

- [x] Adicionar o bloco `networks` de `deploy/compose.prod.yaml` à Stack `estante` no Komodo e fazer **Deploy**. Em 2026-11-09 a produção respondeu `200` em `/api/health`; o `502` não se repete.
- [ ] Redeployar a Stack do cloudflared, se a entrada de `nesse-capitulo.walterdalla.uk` foi adicionada depois do último deploy dela: o container só lê o `config.yml` ao iniciar.
- [ ] Testar pelo túnel: `/api/health`, `/auth/providers` e o redirect de `/auth/google`.
- [ ] Testar o login Google de ponta a ponta. O redirect cadastrado precisa ser `https://nesse-capitulo.walterdalla.uk/auth/google/callback`.
- [ ] Confirmar que o app OAuth foi publicado em **Público-alvo**. Em modo de teste, só entra quem estiver na lista de test users.
- [ ] Commitar `deploy/compose.prod.yaml` e `.claude/perfil/deploy.md`.

## Amigos

- [ ] Atualizar o formulário de **Segurança dos dados** da Play Store: o app agora mostra a outros usuários (amigos que aceitaram o convite) nome, foto, os livros em Lendo e Lidos com o ano e a página atual, e os comentários marcados como públicos.
- [x] Publicar uma política de privacidade: `/privacidade`, com `/termos` e `/excluir-conta` (tarefa play-store, 2026-11-09). Falta a revisão do dono, em § Play Store.

## Play Store (do dono, antes do deploy das páginas legais)

Levantadas em 2026-11-09, na tarefa play-store.

- [ ] **O1 revisão legal** de `/privacidade`, `/termos` e `/excluir-conta`: o texto é rascunho. Em especial idade mínima 13 (dados de adolescentes têm regra própria na LGPD), base legal e direitos do titular, que a pesquisa não cobriu.
- [ ] **O2 backup**: a política diz "dados apagados podem continuar em backups por até 30 dias", e hoje não há agendamento de backup. Garantir que nenhuma cópia passa de 30 dias (inclusive `backup-<data>.db` manuais) ou ajustar a chave `backupRetention` em `server/legalText.ts` nos 3 idiomas.
- [ ] Play Console: URL da política `https://nesse-capitulo.walterdalla.uk/privacidade` e URL de exclusão de conta `https://nesse-capitulo.walterdalla.uk/excluir-conta`.
- [ ] Play Console, **Segurança dos dados**: incluir denúncias (motivo, detalhes e cópia do comentário denunciado), bloqueios e a data de aceite dos termos, além do que § Amigos já lista.
- [ ] Play Console, **classificação de conteúdo**: declarar conteúdo gerado por usuário (comentários públicos entre amigos), com denúncia, bloqueio e moderação.
- [ ] `client/public/.well-known/assetlinks.json`: trocar `package_name` (`com.example.estante`) e o SHA-256 pela chave real de assinatura.
- [ ] Manter `ADS_ENABLED=false` em produção enquanto a política disser que não há anúncios.
- [ ] Conferir uma vez no banco de produção que nenhum outro usuário tem o e-mail `walterdallaprofissional@gmail.com`: o moderador é reconhecido pelo e-mail, e contas antigas gravavam o e-mail sem checar `email_verified`.

## Perfis do harness

- [ ] Confirmar as 15 linhas `[inferido]`: `deploy` 7, `_comum` 5, `implementation` 2, `start-app` 1.
- [ ] Reduzir `.claude/perfil/deploy.md` de 61 para no máximo 60 linhas. O excesso vira doc do repo.
- [x] Corrigir `.claude/perfil/_comum.md:36`: agora cita a URL pública `https://nesse-capitulo.walterdalla.uk`.
- [ ] Decidir se preenche as seções `—`: `_comum` (Clone) e `implementation` (Modelos, Comandos na worktree).

## Só se forem usados

- [ ] Perfis opcionais ausentes, criados com `/wh:perfil <skill>`: `brainstorm`, `feature-docs`, `limpeza`, `qa-visual`.
- [ ] `.impl/` ainda fora do `.git/info/exclude`. O `/wh:implementation` resolve na primeira execução.
