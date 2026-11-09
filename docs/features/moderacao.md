---
aliases: [denúncia, denunciar, report, moderação, moderador, banir, banimento, ban, conteúdo gerado por usuário, ugc]
---
# Denúncia e moderação

Quem vê um comentário público de amigo, ou a tela de um amigo, pode denunciar com um motivo (`spam`, `harassment`, `sexual`, `other`) e detalhes opcionais. O moderador vê as denúncias em `/moderacao` (link no Perfil, só para ele) e decide: descartar, remover o comentário ou banir a conta.

## Símbolos de entrada
`reportsRoutes`, `REPORT_DETAILS_MAX` (`server/routes/reports.ts`), `moderationRoutes` (`server/routes/moderation.ts`), `isModerator`, `MODERATOR_EMAILS` (`server/moderators.ts`), tabela `content_reports` e coluna `users.banned_at` (`server/db.ts`), `ReportReason`/`ReportStatus`/`ModerationAction`/`ModReport` (`server/types.ts`, `client/src/lib/types.ts`), `ReportSheet`, `ModerationPage`, `useReport`, `useModReports`, `useResolveReport`.

## Regras
- Denúncia aponta para um comentário **ou** um usuário, nunca os dois. Só de amigo e só comentário público; o resto dá 404, igual a inexistente. Motivo inválido dá 400 `REPORT_INVALID`.
- A mesma pessoa denunciando o mesmo alvo ainda aberto não duplica (200 em vez de 201).
- Quem denunciou deixa de ver o comentário na hora (nos dois SQL de comentários de amigos); o autor e os outros amigos continuam vendo até a moderação decidir.
- A denúncia guarda uma cópia do texto (`comment_body`): sobrevive à remoção do comentário. Some se a conta denunciada for excluída; fica sem `reporter_id` se quem denunciou excluir a conta.
- Moderador = conta com e-mail verificado em `MODERATOR_EMAILS` (hoje só `CONTACT_EMAIL`). Para os outros, `/api/mod/*` dá 404, e `/moderacao` volta para `/`.
- `GET /api/mod/reports?status=` lista por status (`open` padrão, `dismissed`, `actioned`), mais antigas primeiro, com o nome e e-mail do denunciado.
- Resolver denúncia já resolvida devolve 200 sem mudar nada. `remove_comment` sem comentário e `ban_user` contra moderador dão 400 `REPORT_INVALID`.
- `ban_user` grava `banned_at`, desfaz todas as amizades e apaga as sessões da conta, numa transação. A conta fica no banco para impedir a volta (login barrado em [conta](conta.md)); convite de conta banida vira inválido.

## Interações
- [comentarios](comentarios.md): denunciar fica no comentário de amigo; `remove_comment` apaga o comentário.
- [amigos](amigos.md): denúncia só entre amigos; o ban desfaz amizades e invalida convites; bloquear é a outra saída na tela do amigo.
- [conta](conta.md): `isModerator` em `/api/me`; o ban derruba a sessão e barra o login com `ACCOUNT_BANNED`.
- [legal](legal.md): os termos descrevem conteúdo proibido, denúncia e banimento; a política descreve a retenção da denúncia e da conta banida.
