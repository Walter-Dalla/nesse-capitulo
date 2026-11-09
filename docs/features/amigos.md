---
aliases: [amigos, amizade, convite, badge, selo, quem já leu]
---
# Amigos e selo de quem já leu

Amizade por link de convite: gero o link pelo botão "Convidar" no cabeçalho da aba Amigos (a lista de amigos vem primeiro; sem amigos, o estado vazio traz o botão), quem abre vê quem convidou e só vira amigo ao tocar em "Confirmar amizade". O link é de uso único e não expira; aberto deslogado, sobrevive ao login (código guardado no aparelho por 1 h). Amigos veem o que o outro está lendo (com a página atual) e já leu, e os comentários públicos; nunca nota, resenha, datas, comentários privados, sinopse ou e-mail. Depois que um livro está na minha estante, a tela dele e os cartões de Estante e Por ano mostram quais amigos já o leram (status `read`), casando por `book_id` ou ISBN. A busca não mostra nem consulta nada de amigos.

## Símbolos de entrada
`friendsRoutes`, `resolveInvite`, `areFriends`, `BADGES_SQL`, `MY_FRIENDS` (`server/routes/friends.ts`), `rowToBook` (`server/routes/shelf.ts`), `FriendUser`/`FriendBook`/`FriendSummary`/`FriendInvitePreview` (`server/types.ts`, `client/src/lib/types.ts`), tabelas `friendships`/`friend_invites` e índices `idx_user_books_book`/`idx_books_isbn_upper` (`server/db.ts`), `FriendsPage`, `FriendDetailPage`, `FriendInvitePage`, `FriendBadge`/`Avatar` (`client/src/components/FriendBadge.tsx`), `RequireAuth` (`client/src/App.tsx`), `pendingInvite.ts`, `useFriends`, `useFriendShelf`, `useBookFriends`, `useFriendBadges`, `useInvite`, `useCreateInvite`, `useAcceptInvite`, `useRemoveFriend`, `friendsReadText`/`friendsReadChip`/`displayName` (`client/src/lib/format.ts`).

## Regras
- `GET /api/friends/invites/:code` nunca escreve no banco: prévia de link (WhatsApp), recarregar e "Agora não" não criam amizade.
- `resolveInvite` decide prévia e confirmação na mesma ordem: inexistente → 404; meu → 400 `INVITE_SELF`; já usado por mim → "já amigos" (ou 404 se a amizade foi desfeita); usado por outro → 404; já amigos → "já amigos" sem consumir; senão aberto.
- Não amigo e ex-amigo recebem o mesmo 404 de um id inexistente; nunca 403.
- O selo em lote usa `UNION` entre `book_id` e ISBN: o `OR` não usa índice e travaria o processo único com estantes grandes.

## Interações
- [estante](estante.md): selo na tela do livro e chip em `BookCard`; `/api/shelf/:id/friends` exige que o item seja meu.
- [historico-anos](historico-anos.md): chip nos cartões de Por ano; amigos veem o `readYear` dos meus Lidos.
- [conta](conta.md): `RequireAuth` guarda e retoma o convite; `useLogout` limpa o guardado; texto público do login.
- [busca](busca.md): nenhuma mudança, por decisão do dono.
- [comentarios](comentarios.md): comentários públicos aparecem na tela do amigo e na tela do livro de quem tem o mesmo livro.
