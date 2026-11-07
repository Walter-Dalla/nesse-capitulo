# Glossário

Vocabulário de negócio ↔ identificadores do código. Coluna "Evite" só traz sinônimos que o repo de fato mistura.

## Estante e status

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Estante | `ShelfPage`, `GET /api/shelf`, tabela `user_books` | "biblioteca", "lista" (lista = um dos quatro status) |
| Item da estante | `ShelfItem`, `getItem`, `rowToItem` (usa `rowToBook`) | um livro na estante de um usuário; não confundir com `Book` |
| Status | `Status` (`want`, `reading`, `read`, `abandoned`), `parseStatus`, `STATUS_LABEL` | as quatro listas |
| Quero ler | `want` | "wishlist" |
| Lendo | `reading` | |
| Lido | `read` | |
| Abandonado | `abandoned` | "desistido" |
| Nota | `rating` (1 a 5), `Stars` | "avaliação" é a soma de nota + resenha |
| Resenha | `review` | privada |
| Datas de leitura | `startedAt`, `finishedAt`, `reconcile` | mudar de status limpa ou preenche datas (README § Regras) |
| Ano de leitura | `readYear`, `YearsPage`, `GET /api/shelf?year=` | registro retroativo: só o ano, data opcional |
| Mudar status | `PATCH /api/shelf/:id`, `useUpdateItem`, `STATUS_ACTION` | |

## Livro e fontes

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Livro | `Book`, `BookInput`, tabela `books`, `findOrCreateBook` | metadados mínimos; sem capa nem sinopse no banco |
| Fonte | `BookSource` (`google`, `openlibrary`, `manual`), `SOURCE_LABEL` | "provider" aparece só no retorno da busca |
| Busca / autocompletar | `SearchPage`, `useSearch`, `searchBooks`, `GET /api/search` | 1 s de debounce (`SEARCH_DEBOUNCE_MS`), mínimo 3 letras |
| Google Books | `normalizeVolume`, `GOOGLE_BOOKS_API_KEY` | fonte principal |
| Open Library | `normalizeOpenLibraryDoc` | reserva quando o Google falha |
| Cadastro manual | `AddManualPage`, `/adicionar`, fonte `manual` | capa derivada do ISBN |
| Referência de capa | `coverRef` / `cover_ref` (`g`, `ol:<id>`, null), `coverUrlFor`, `BookCover` | a URL é montada no cliente |
| Sinopse | `BookDetails.description`, `books.description`, `fetchDetails`, `GET /api/shelf/:id/details` | buscada na fonte na primeira consulta e gravada no banco; não sai nas rotas de amigos |
| Limite de busca | `allowSearch` | rajada de 5, depois 1/s por usuário; cache 10 min |

## Conta e sessão

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Login com Google | `GET /auth/google`, `/auth/google/callback`, `upsertGoogleUser` | fluxo web |
| Login nativo | `POST /auth/google/token`, `verifyIdTokenRemote` | app Android/iOS envia `idToken` |
| Login dev | `POST /auth/dev`, `ALLOW_DEV_LOGIN` | botão "Entrar sem Google"; nunca em produção |
| Sessão | `createSession`, `findSession`, cookie `sid`, tabela `sessions` | 30 dias |
| Usuário | `User`, `useMe`, `GET /api/me` | |

## Amigos

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Amigo / amizade | `FriendUser`, `friendships` (`user_low` < `user_high`), `areFriends`, `friendsRoutes` | uma linha por par, sem pedido pendente; vale nos dois sentidos. "seguir", "seguidor" |
| Convite | `friend_invites`, `POST /api/friends/invites`, `resolveInvite`, `FriendInvitePage`, `/amigos/convite/:code` | link de uso único, 7 dias (`INVITE_TTL_MS`); abrir não cria amizade, só o toque em "Confirmar amizade" |
| Convite guardado | `pendingInvite.ts` (`savePendingInvite`, `pendingInviteRedirect`), chave `estante:convite` | código salvo no aparelho por 1 h para sobreviver ao login; limpo ao chegar à tela do convite e no logout |
| Estante do amigo | `GET /api/friends/:userId/shelf`, `FriendBook`, `FriendDetailPage` | só Lendo e Lidos, com ano; sem nota, resenha, datas, sinopse ou e-mail |
| Amigos que já leram (selo) | `FriendBadge`, `GET /api/shelf/:id/friends`, `GET /api/friends/badges`, `BADGES_SQL`, `useFriendBadges` | conta amigos com o livro em `read`; casa por `book_id` ou ISBN, nunca por título + autor; nunca na busca |

## Monetização e estatísticas

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Gate de anúncio | `AdGate`, `adUnlocked`, `GET /api/ads/status`, `POST /api/ads/reward`, `AD_REQUIRED` | uma vez por sessão, só ao criar livro (docs/MONETIZACAO.md) |
| Provedor de anúncio | `AD_PROVIDER` (`simulated`, `adsense`) | |
| Estatísticas | `GET /api/stats`, `useStats`, `statsRoutes` | totais por status e por ano: livros, páginas, nota média |

## Armadilhas

| No código | Significa | Por quê |
| --- | --- | --- |
| `read` (status) | livro lido, concluído | não é "ler" nem permissão de leitura |
| `sourceId` vs `id` | id na fonte externa vs id interno | `findOrCreateBook` deduplica por `source` + `sourceId` |
| `ShelfItem.id` vs `book.id` | id da linha `user_books` vs id do `books` | as rotas `/api/shelf/:id` usam o do item |
| `isProd` | `NODE_ENV=production` ou rodar o `.js` compilado | `npm start` desliga o login dev mesmo sem `NODE_ENV` |
| `/api/shelf/:id/friends` | amigos que já leram o **meu** item `:id` | mora em `friendsRoutes`, não em `shelfRoutes`; 404 se o item não for meu |
| Selo de amigos e `["item"]` | o selo usa as chaves `["friends", …]` do React Query | `invalidateShelf` não refaz `["friends","book",id]`: daria 404 durante a remoção do item |
