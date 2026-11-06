# Análise: amizades e badge de amigos

**Perfil da tarefa: completo** (cliente + servidor, schema novo, contrato novo, privacidade entre usuários).
Base: `main` @ eacf10e; suíte de partida `# pass 13 / # fail 0` (`npm test`). Protótipo: `.impl/amizades/proto/match.mjs`.
Respostas do dono incorporadas na etapa `planejar`: ver Decisões. Protótipo do SQL final: `.impl/amizades/proto/sql.mjs` (`match.mjs` ficou só como registro da opção de título + autor, descartada).

## 1. Produto
- Hoje nada é compartilhado: todas as rotas filtram por `user_id` da sessão [código server/routes/shelf.ts:98] [doc docs/features/estante.md]; há teste de não vazamento [código tests/api.test.ts:116].
- Nota e resenha são privadas [doc README.md:10]; a tela promete "Só você vê." para a resenha [código client/src/pages/BookDetail.tsx:123], o que continua verdade.
- **Promessa que vira falsa:** "Seus dados ficam na sua conta e só você vê." [código client/src/pages/Login.tsx:67]. Muda neste trabalho.
- `docs/MONETIZACAO.md:54` proíbe "Vender ou cruzar dados de leitura": regra comercial, não veto a amigos que consentem (confirmado pelo dono, P4). Sem política de privacidade no repo (`grep` vazio); o formulário de dados da Play Store fica fora do repo: pendência do dono no relatório.
- Busca fica como está: pedido explícito do dono. `server/routes/search.ts`, `client/src/pages/Search.tsx` e `client/src/components/AddSheet.tsx` não mudam.

## 2. Arquitetura
- Entrada: `createApp` monta sub-apps sob `requireAuth` [código server/app.ts:30-36]. Rota nova entra ali; `/api/*` já exige sessão [código server/auth.ts:84].
- `friendsRoutes` não lê corpo nem lança `ValidationError`, então não precisa de `onError` próprio, como `statsRoutes` [código server/routes/stats.ts:5].
- Persistência: `SCHEMA` idempotente + `migrate` [código server/db.ts:6,77]. Tabela nova só com `CREATE TABLE IF NOT EXISTS`.
- Transação síncrona `transaction` [código server/db.ts:93]; `node:sqlite` é síncrono, sem intercalação dentro dela.
- Identidade do livro: `findOrCreateBook` só deduplica por `source`+`sourceId` [código server/routes/shelf.ts:44]; manual sempre cria linha nova [código tests/api.test.ts:54]. Google e Open Library geram linhas distintas para a mesma obra. O dono escolheu `book_id` ou ISBN (P2): edição diferente e manual sem ISBN não casam, por decisão.
- `books.isbn13` pode guardar ISBN-10 ou ter `x`/`X` [código server/validate.ts:53-54].
- Cliente: query keys + `invalidateShelf` [código client/src/lib/api.ts:57]; `queries` com `staleTime` 30 s, `retry` 1 e refetch no foco [código client/src/lib/api.ts:6]; logout remove tudo menos `me` [código client/src/lib/hooks.ts:82]; service worker não toca em `/api/` [código client/public/sw.js:48].
- Login sempre termina em `/`: Google por `c.redirect("/")` [código server/auth.ts:183], dev e já logado por `<Navigate to="/">` [código client/src/pages/Login.tsx:22]. Deslogado cai em `/login` sem guardar destino [código client/src/App.tsx:21].
- Raio de impacto: `BookCard` é usado por `ShelfPage` e `YearsPage` (CodeGraph); `getItem` tem 5 chamadores, todos em shelf.ts; `rowToItem` privado. Nenhum contrato existente muda.

## 3. Arquivos técnicos
| Arquivo | Linhas | Papel |
|---|---|---|
| `server/db.ts` | 103 | `SCHEMA`: `friendships`, `friend_invites`, 2 índices em tabelas existentes |
| `server/types.ts` | 60 | `FriendUser`, `FriendBook`, `FriendSummary` |
| `server/app.ts` | 44 | registra `friendsRoutes(db)` após `adsRoutes` (:35) |
| `server/routes/shelf.ts` | 226 | extrai e exporta `rowToBook` de `rowToItem` (:29-39), sem mudar comportamento |
| `server/routes/friends.ts` (novo) | | todas as rotas novas |
| `tests/friends-helpers.ts`, `tests/friends-invites.test.ts`, `tests/friends-shelf.test.ts`, `tests/friends-badges.test.ts`, `tests/pending-invite.test.ts` (novos) | | helper e Aceites |
| `client/src/lib/types.ts` | 95 | espelho dos tipos |
| `client/src/lib/api.ts` | 63 | métodos `Api.*`; `invalidateShelf` (:57) inclui `["friends","badges"]` |
| `client/src/lib/hooks.ts` | 96 | hooks novos; `useLogout` (:76) limpa convite pendente |
| `client/src/lib/pendingInvite.ts` (novo) | | convite guardado durante o login |
| `client/src/App.tsx` | 47 | rotas lazy; `RequireAuth` (:18) guarda e retoma o convite |
| `client/src/components/BottomNav.tsx` | 32 | 5ª aba "Amigos" |
| `client/src/components/Icons.tsx` | 45 | `IconFriends` |
| `client/src/components/BookCard.tsx` | 30 | chip do badge (:15-25) |
| `client/src/components/FriendBadge.tsx` (novo) | | seção do badge na tela do livro; avatar com fallback |
| `client/src/pages/BookDetail.tsx` | 159 | renderiza `FriendBadge` após a seção da capa (:83) |
| `client/src/pages/Friends.tsx` (novo) | | gerar link, amigos e o que leem |
| `client/src/pages/FriendDetail.tsx` (novo) | | Lendo e Lidos de um amigo, desfazer amizade |
| `client/src/pages/FriendInvite.tsx` (novo) | | mostra quem convidou e confirma |
| `client/src/pages/Login.tsx` | 71 | texto da linha 67 e aviso de convite |

Docs protegidos (`README.md § API`, `docs/GLOSSARIO.md`, `docs/features/*`, feature nova `amigos.md`): fase 6 do orquestrador, fora das faixas.

## 4. Proposta
### Comportamento
| | Antes | Depois |
|---|---|---|
| Rede | não existe | aba Amigos: gero um link; quem abre vê quem convidou e vira meu amigo com um toque de confirmar |
| Acompanhar | não existe | lista de amigos com o que cada um está lendo; ao tocar, Lendo e Lidos dele |
| Livro na minha estante | sem sinal social | badge `Ana e João já leram` na tela do livro; chip `2 amigos leram` no cartão de Estante e Por ano |
| Busca | Google/Open Library | igual, nenhum badge ou consulta de amigos |

Depois de `AddSheet` salvar, o app navega para `/livro/:id` [código client/src/components/AddSheet.tsx:46] e só então `GET /api/shelf/:id/friends` roda. A rota exige item meu (404 se não for): é o que garante "depois de adicionar".

### Convite
- Código `randomBytes(16).toString("base64url")`, como a sessão [código server/auth.ts:23]: não dá para adivinhar, sem limite de tentativas.
- **Uso único, validade de 7 dias** (`INVITE_TTL_MS`), decisão do enriquecedor: link encaminhado vale para uma pessoa só, e dá acesso às leituras de quem convidou. Alternativa descartada: link fixo por usuário (quem receber o encaminhamento vira amigo, para sempre, sem revogação).
- Gerar: `POST` cria outro código, vários ativos convivem; apaga os meus expirados, como `createSession` [código server/auth.ts:27]. Sem lista de convites: expira sozinho.
- A URL é montada no cliente: `${location.origin}/amigos/convite/${code}`. Compartilha com `navigator.share`, senão `navigator.clipboard`, senão mostra em campo só de leitura.
- GET não muda nada: prévia de link (WhatsApp) recebe só o HTML da SPA [código server/index.ts:27]; a amizade nasce no `POST` do toque em `Confirmar amizade`, nunca em efeito.
**Sobreviver ao login.** `RequireAuth` é o único ponto: deslogado em `/amigos/convite/:code` grava `{ code, savedAt }` em `localStorage` e vai para `/login`; logado com convite guardado e fora de **qualquer** rota de convite, redireciona (`pendingInviteRedirect`, função pura testada). Cobre Google e dev, que passam por `/`. `FriendInvite` limpa o guardado **ao montar**, não ao confirmar: o código fica na URL e no servidor, e `Agora não` não cai em laço. Validade local de 1 h e limpeza no logout: em aparelho compartilhado, outra pessoa que entre depois não vira amiga. `localStorage`, não `sessionStorage`: login pode voltar em outra aba. Alternativa descartada: destino no `state` do OAuth (mexe em `server/auth.ts`, e redirect por parâmetro abre risco de open redirect).
**Confirmação (dono):** a tela mostra quem convidou (`GET`, não consome) e só vira amigo no toque. Protege quem abre: link de estranho tocado uma vez não expõe nada. Ver o convite exige sessão; devolve só nome e foto de quem convidou.

### Schema (validado em `proto/sql.mjs`)
```sql
CREATE TABLE IF NOT EXISTS friendships (
  user_low TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_high TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_low, user_high),
  CHECK (user_low < user_high)
);
CREATE INDEX IF NOT EXISTS idx_friendships_high ON friendships(user_high);
CREATE TABLE IF NOT EXISTS friend_invites (
  code TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,       -- ms, como sessions.expires_at
  used_by TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON friend_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book ON user_books(book_id, status);
CREATE INDEX IF NOT EXISTS idx_books_isbn_upper ON books(upper(isbn13)) WHERE isbn13 IS NOT NULL;
```
Par canônico: uma linha por amizade, sem pendente; o protótipo recusa `b→a` e `a→a` pelo `CHECK`.

### Contrato (vocabulário único; as faixas citam esta tabela)
| Rota | Resposta | Erros |
|---|---|---|
| `POST /api/friends/invites` | `201 { code, expiresAt }` | |
| `GET /api/friends/invites/:code` | `{ inviter: FriendUser, alreadyFriends: boolean }`, sem consumir | mesmos do accept |
| `POST /api/friends/invites/:code/accept` | `201 { friend: FriendUser }` criou; `200` igual se já amigos | 404 `Convite inválido ou expirado`; 400 `{ error: "Este convite é seu", code: "INVITE_SELF" }` |
| `GET /api/friends` | `{ friends: FriendSummary[] }` | |
| `DELETE /api/friends/:userId` | `{ ok: true }`, nos dois sentidos | 404 `Não encontrado` |
| `GET /api/friends/:userId/shelf` | `{ friend: FriendUser, items: FriendBook[] }` | 404 `Não encontrado` se não for amigo |
| `GET /api/shelf/:id/friends` | `{ friends: FriendUser[] }`, amigos com o livro em `read` | 404 `Não encontrado`, item não é meu |
| `GET /api/friends/badges` | `{ badges: Record<itemId, number> }`, só contagens > 0 | |
```ts
interface FriendUser { id: string; name: string | null; picture: string | null }   // nunca e-mail
interface FriendBook { status: "reading" | "read"; readYear: number | null; book: Book }
interface FriendSummary extends FriendUser { reading: FriendBook[] }
interface FriendInvitePreview { inviter: FriendUser; alreadyFriends: boolean }
```
`resolveInvite`, uma função para `GET` e accept, nesta ordem:
1. Código inexistente ou vencido: 404.
2. `inviter_id` sou eu: 400 `INVITE_SELF`, sem consumir.
3. `used_by` sou eu: `alreadyFriends` se a amizade existe; 404 se foi desfeita (reabrir não refaz). Cobre toque duplo.
4. `used_by` é outro: 404.
5. Já amigos: `alreadyFriends`, sem consumir.
6. Senão: aberto. `GET` só informa; accept insere a amizade, grava `used_by`, 201 (`transaction`).

### Privacidade
- Amigo vê só `reading` e `read`; `want` e `abandoned` não aparecem.
- `FriendBook` é projeção com colunas explícitas: **não reutilizar `SELECT_ITEM`/`rowToItem`**, que trazem `rating`, `review` e datas [código server/routes/shelf.ts:11]. `books.description` fica fora. `publicUser` não serve: inclui e-mail [código server/auth.ts:229].
- `Login.tsx:67` passa a `Seus dados ficam na sua conta. Amigos veem só o que você está lendo e já leu.` Garantias: `friendsRoutes` (404 sem amizade) e a projeção de `FriendBook`.
- Livro do amigo não tem link para `/livro/:id` (`getItem` daria 404 [código server/routes/shelf.ts:60]); por isso não reutiliza `BookCard`, só `BookCover` e `formatAuthors`.

### Mesmo livro e custo (P2)
`book_id` igual ou `upper(isbn13)` igual. ISBN-10 × ISBN-13 da mesma edição não casam. **O `OR` ingênuo é proibido:** medido em 500 livros × 50 amigos × 500 lidos, leva ~6,5 s e trava o processo único; `UNION` com os dois índices novos leva ~15 ms e dá o mesmo resultado (`proto/sql.mjs`). São estimativas; o Aceite é `EXPLAIN QUERY PLAN` citando `idx_books_isbn_upper` e `idx_user_books_book`. SQL em `.impl/amizades/servidor.md`.

### Cliente
- Query keys: `["friends"]`, `["friends","detail",id]`, `["friends","book",itemId]`, `["friends","badges"]`. Mutação de amizade invalida o prefixo `["friends"]`. **Badge não usa prefixo `["item"]`:** `invalidateShelf` refaria a chamada e daria 404 durante a remoção.
- `useBookFriends` e `useFriendBadges`: `retry: false`, erro silencioso. `useFriendBadges` fica dentro de `BookCard`; React Query deduplica.
- Textos: `Ana já leu`, `Ana e João já leram`, `Ana, João e mais 2 já leram`; cartão `1 amigo leu`, `2 amigos leram`. `name` nulo: `Leitor(a)`, como `Profile.tsx:24`.

## Riscos
- **Formato persistido:** só tabelas e índices novos; imagem anterior os ignora; rollback sem passo. Índices nascem no boot com `IF NOT EXISTS`, rápido no porte atual [inferido].
- **Valor derivado (badge):** nada gravado. Alteram a entrada: `POST /api/shelf` (:144-152), `PATCH` (:194), `DELETE` (:219), edição de ISBN manual (:189), criar e desfazer amizade. Quem vê: eu, na tela do livro e nos cartões. Mudança do amigo chega em até 30 s ou no foco; minha, por `invalidateShelf`.
- **Acesso entre usuários:** principal risco. Testes: não amigo e ex-amigo recebem 404 em `/shelf`; item alheio → 404; resposta sem as chaves `rating`, `review`, `startedAt`, `finishedAt`, `description`, `email` e sem o texto da resenha.
- **Link vazado:** vale uma vez; logs do `logger` só fora de produção [código server/app.ts:23]; `secureHeaders` define `Referrer-Policy` [inferido].
- **Cliente, frio/quente:** frio deslogado: passa pelo login e retoma. Frio ou quente logado: rota direta. SPA e SW cobrem a rota [código server/index.ts:27, client/public/sw.js:66]; `scope: "/"` no manifest cobre a TWA. Offline: `POST` falha e a tela mostra erro com `Tentar de novo`. O caminho completo só é provado no QA visual, sem teste automático de tela no repo.
- **Consumidor antigo, anúncio e texto público:** nenhuma resposta existente muda; rotas novas não criam livro; `AD_REQUIRED` intocado. `README.md:10` e `BookDetail.tsx:123` seguem verdadeiros; manifest sem afirmação de privacidade.

## Decisões
Do dono:
- **P1:** link de convite; precisa sobreviver ao login.
- **Toque de confirmação:** tela mostra quem convidou; só vira amigo no toque. Substitui "quem abre vira amigo".
- **P2:** `book_id` ou ISBN, sem título + autor.
- **P3:** tela do livro + cartões de Estante e Por ano.
- **P4:** `docs/MONETIZACAO.md:54` não é violado; regra comercial, amigos consentem.
- Docs protegidos ficam para a fase 6.

Do enriquecedor: convite de uso único com 7 dias; pendente local de 1 h, limpo ao chegar à tela; amigo vê só Lendo e Lidos; badge conta só `read`; nota e resenha privadas; sem bloqueio; sem push; sem coluna derivada; e-mail fora de todo o contrato.
