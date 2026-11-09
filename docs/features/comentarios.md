---
aliases: [comentários, comentário, público, privado, visibilidade, página atual, progresso]
---
# Comentários e página atual

A página atual também pode ser atualizada direto no cartão da Estante ("+ Página" → `PageSheet`), sem abrir o livro; ver [estante](estante.md).

Na tela do livro, o leitor escreve quantos comentários quiser, cada um **privado** (só ele vê) ou **público** (amigos veem), e pode editar, trocar a visibilidade ou apagar depois. Também informa a página em que está (Lendo) ou parou (Abandonado); os cartões da Estante mostram "Pág. X de Y · Z%" com uma barra de progresso.

## Símbolos de entrada
`commentsRoutes`, `FRIEND_COMMENTS_SQL`, `COMMENT_MAX` (`server/routes/comments.ts`), tabela `book_comments` (`server/db.ts`), `BookComment`/`PublicComment`/`FriendComment`/`CommentVisibility` (`server/types.ts`, `client/src/lib/types.ts`), `Comments` (`client/src/components/Comments.tsx`), `useComments`, `useAddComment`, `useUpdateComment`, `useRemoveComment`; página atual: `current_page`, `reconcile`, `PAGE_MAX` (`server/routes/shelf.ts`), `currentPage` em `ShelfItem`/`ItemDraft`, `readingPercent`, `pageProgressText` (`client/src/lib/format.ts`), `ProgressBar`.

## Regras
- Comentário novo é privado se a visibilidade não vier. Texto obrigatório, até 2000 caracteres.
- Só o autor lê, edita ou apaga os próprios comentários pelas rotas `/api/shelf/:id/comments` e `/api/comments/:id`; item ou comentário alheio dá 404.
- Público aparece para amigos: na tela do amigo (livros em Lendo e Lidos) e na tela do livro de quem tem o mesmo livro (book_id ou ISBN), em qualquer status. Tornar privado ou desfazer a amizade tira da vista na hora.
- Tornar público (criar ou editar) exige ter aceitado os termos: sem aceite, 403 `TERMS_REQUIRED` (`hasAcceptedTerms`); privado não exige.
- Comentário público que eu denunciei some só para mim, nas duas consultas de comentários de amigos (`FRIEND_COMMENTS_SQL` e a estante do amigo).
- Remover o livro da estante apaga os comentários dele (`ON DELETE CASCADE`).
- Página atual: só em Lendo e Abandonado; Quero ler e Lido limpam. Vai no rascunho da tela do livro, com o resto, no botão Salvar.

## Interações
- [estante](estante.md): os dois moram na tela do livro; o cartão mostra o progresso.
- [amigos](amigos.md): amigos veem o progresso de quem está lendo e os comentários públicos.
- [conta](conta.md): público exige o aceite dos termos.
- [moderacao](moderacao.md): "Denunciar" no comentário de amigo; a moderação pode remover o comentário.
