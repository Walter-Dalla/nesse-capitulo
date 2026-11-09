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
| Página atual / progresso | `currentPage` / `current_page`, `readingPercent`, `pageProgressText`, `ProgressBar` | só em Lendo (onde estou) e Abandonado (onde parei); Quero ler e Lido limpam |
| Comentário | `BookComment`, tabela `book_comments`, `commentsRoutes`, `Comments`, `useComments` | vários por livro; não confundir com a resenha (uma só, sempre privada) |
| Visibilidade do comentário | `visibility` (`private`, `public`), `VISIBILITY_LABEL` | público = amigos veem; não existe "todos os usuários" |
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
| Fonte do livro (link e atribuição) | `bookSourceUrl`, `searchAttribution` | "Ver no Google Books"/Open Library por resultado e na tela do livro (nunca no manual); rodapé "Powered by Google" ou "via Open Library", decidido pela fonte |

## Conta e sessão

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Login com Google | `GET /auth/google`, `/auth/google/callback`, `upsertGoogleUser` | fluxo web |
| Login nativo | `POST /auth/google/token`, `verifyIdTokenRemote` | app Android/iOS envia `idToken` |
| Login dev | `POST /auth/dev`, `ALLOW_DEV_LOGIN` | botão "Entrar sem Google"; nunca em produção |
| Sessão | `createSession`, `findSession`, cookie `sid`, tabela `sessions` | 30 dias |
| Usuário | `User`, `useMe`, `GET /api/me` | `/api/me` traz também `termsAccepted` e `isModerator` |
| Termos de uso / aceite | `TERMS_VERSION`, `hasAcceptedTerms`, `POST /api/terms/accept`, `users.terms_version`/`terms_accepted_at`, `TermsGate`, `TERMS_REQUIRED` | aceite único depois do login; `/perfil` fica fora do gate; sem aceite, comentário público e convite dão 403 `TERMS_REQUIRED` |
| Excluir conta | `DELETE /api/account`, `accountRoutes`, `useDeleteAccount` | apaga a linha de `users`; o resto vai pelas chaves estrangeiras e pelo gatilho de livros manuais |
| E-mail verificado | `verifiedEmail` | e-mail só é gravado com `email_verified`; é o que torna seguro o moderador por e-mail |

## Amigos

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Amigo / amizade | `FriendUser`, `friendships` (`user_low` < `user_high`), `areFriends`, `friendsRoutes` | uma linha por par, sem pedido pendente; vale nos dois sentidos. "seguir", "seguidor" |
| Convite | `friend_invites`, `POST /api/friends/invites`, `resolveInvite`, `FriendInvitePage`, `/amigos/convite/:code` | link de uso único, sem validade; abrir não cria amizade, só o toque em "Confirmar amizade" |
| Convite guardado | `pendingInvite.ts` (`savePendingInvite`, `pendingInviteRedirect`), chave `estante:convite` | código salvo no aparelho por 1 h para sobreviver ao login; limpo ao chegar à tela do convite e no logout |
| Estante do amigo | `GET /api/friends/:userId/shelf`, `FriendBook`, `FriendShelfItem`, `FriendDetailPage` | só Lendo e Lidos, com ano, página atual e comentários públicos; sem nota, resenha, datas, sinopse ou e-mail |
| Comentários de amigos | `FriendComment`, `GET /api/shelf/:id/comments` (`friends`) | públicos de amigos sobre o mesmo livro (book_id ou ISBN), em qualquer status da estante deles |
| Amigos que já leram (selo) | `FriendBadge`, `GET /api/shelf/:id/friends`, `GET /api/friends/badges`, `BADGES_SQL`, `useFriendBadges` | conta amigos com o livro em `read`; casa por `book_id` ou ISBN, nunca por título + autor; nunca na busca |
| Bloqueio | `user_blocks`, `isBlocked`, `POST /api/friends/:userId/block`, `GET /api/friends/blocks`, `DELETE /api/friends/blocks/:userId` | desfaz a amizade e invalida convites nos dois sentidos; desbloquear não refaz a amizade |

## Denúncia e moderação

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Denúncia | `content_reports`, `POST /api/reports`, `reportsRoutes`, `ReportReason` (`spam`, `harassment`, `sexual`, `other`), `ReportSheet`, `REPORT_INVALID` | de um comentário público de amigo ou de um amigo; esconde o comentário só de quem denunciou; guarda cópia do texto |
| Situação da denúncia | `ReportStatus` (`open`, `dismissed`, `actioned`) | |
| Moderador | `isModerator`, `MODERATOR_EMAILS`, `moderationRoutes`, `ModerationPage`, `/moderacao` | hoje só `CONTACT_EMAIL`; quem não modera recebe 404 em `/api/mod/*` |
| Decisão do moderador | `ModerationAction` (`dismiss`, `remove_comment`, `ban_user`), `POST /api/mod/reports/:id/resolve` | |
| Banimento / conta banida | `users.banned_at`, `ACCOUNT_BANNED`, `/login?error=banned` | a conta fica no banco para barrar a volta; sessões e amizades saem; "suspensa" é só o texto da mensagem |

## Páginas legais

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Páginas legais | `LEGAL_PATHS` (`/privacidade`, `/termos`, `/excluir-conta`), `renderLegal`, `LEGAL_TEXT`, `legalRoutes` | públicas, HTML do servidor, 3 idiomas; não são rotas da SPA |
| Contato do desenvolvedor | `CONTACT_EMAIL`, `DEVELOPER_NAME`, `APP_NAME` (`server/contact.ts`) | constantes, não env; também no User-Agent da busca |
| Retenção em backup | chave `backupRetention` (`server/legalText.ts`) | "até 30 dias"; tem de ser verdade no deploy |

## Monetização e estatísticas

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Gate de anúncio | `AdGate`, `adUnlocked`, `GET /api/ads/status`, `POST /api/ads/reward`, `AD_REQUIRED` | uma vez por sessão, só ao criar livro (docs/MONETIZACAO.md) |
| Provedor de anúncio | `AD_PROVIDER` (`simulated`, `adsense`) | |
| Estatísticas | `GET /api/stats`, `useStats`, `statsRoutes` | totais por status e por ano: livros, páginas, nota média |

## Idioma

| Negócio | Código | Evite / nota |
| --- | --- | --- |
| Idioma | `Locale` (`pt`, `en`, `es`), `negotiateLocale`, `initialLocale` | `pt` = pt-BR; `es` neutro |
| Seletor de idioma | `LanguageSwitch`, `changeLocale` | na home são links `/?lang=` |
| Escolha salva | cookie `lang` | por aparelho; não existe coluna em `users` |
| Texto traduzido | `t`, `tp`, `client/src/lib/messages/` | |
| Código de erro | `code`, `ERROR_CODES`, `apiErrorMessage` | `error` segue em PT, para compatibilidade |
| Nota (em espanhol) | "valoración", "valorar" | "nota", "calificar" |

## Armadilhas

| No código | Significa | Por quê |
| --- | --- | --- |
| `read` (status) | livro lido, concluído | não é "ler" nem permissão de leitura |
| `sourceId` vs `id` | id na fonte externa vs id interno | `findOrCreateBook` deduplica por `source` + `sourceId` |
| `ShelfItem.id` vs `book.id` | id da linha `user_books` vs id do `books` | as rotas `/api/shelf/:id` usam o do item |
| `isProd` | `NODE_ENV=production` ou rodar o `.js` compilado | `npm start` desliga o login dev mesmo sem `NODE_ENV` |
| `/api/shelf/:id/friends` | amigos que já leram o **meu** item `:id` | mora em `friendsRoutes`, não em `shelfRoutes`; 404 se o item não for meu |
| Selo de amigos e `["item"]` | o selo usa as chaves `["friends", …]` do React Query | `invalidateShelf` não refaz `["friends","book",id]`: daria 404 durante a remoção do item |
| `POST /api/terms/accept` | aceite dos termos | mora em `accountRoutes` (`server/routes/account.ts`), não num `termsRoutes`; a regra fica em `server/terms.ts` |
