# servidor · amizades · onda W1 · porta 3101 · 4 itens · 9 arquivos (~433 + novos)
Contexto: amizades entre usuários por link de convite (quem abre vê quem convidou e vira amigo com um toque de confirmar), para acompanhar o que amigos leem, e badge dos amigos que já leram um livro da minha estante. Esta faixa produz a API; a faixa `cliente` consome na W2. Decisões: amigo vê só `reading` e `read`; nota, resenha, datas, sinopse e e-mail nunca saem nas rotas novas; "mesmo livro" = `book_id` igual ou `upper(isbn13)` igual; busca não muda. Base: `main` @ eacf10e.
Dono de: `server/routes/friends.ts` (novo) `server/routes/shelf.ts` (226 linhas; só `rowToBook`) `tests/friends-helpers.ts` (novo) `tests/friends-invites.test.ts` (novo) `tests/friends-shelf.test.ts` (novo) `tests/friends-badges.test.ts` (novo). Pode tocar o mínimo de: —. União: `server/db.ts` `server/types.ts` `server/app.ts`.
Par: `cliente` (consome o contrato na W2).

Não mexa em `server/routes/search.ts`, em `README.md`, `docs/` ou `.claude/` (docs ficam para a fase 6). Testes: padrão de `tests/api.test.ts:7-27` (`process.env.ALLOW_DEV_LOGIN = "true"`, `NODE_ENV = "test"` antes do `import` dinâmico; `app.request` com `Cookie`, `Origin`, `Host`). `tests/friends-helpers.ts` exporta um `client(db)` e uma função que cria dois usuários logados **no mesmo** `db` e os torna amigos pela API. Vencimento nos testes: `UPDATE friend_invites SET expires_at = 0` direto no `db`.

## Contrato (produza exatamente isto)
| Rota | Resposta | Erros |
|---|---|---|
| `POST /api/friends/invites` | `201 { code, expiresAt }` | |
| `GET /api/friends/invites/:code` | `{ inviter: FriendUser, alreadyFriends: boolean }`, sem consumir | 404 `{ error: "Convite inválido ou expirado" }`; 400 `{ error: "Este convite é seu", code: "INVITE_SELF" }` |
| `POST /api/friends/invites/:code/accept` | `201 { friend: FriendUser }` criou; `200` igual se já amigos | 404 `{ error: "Convite inválido ou expirado" }`; 400 `{ error: "Este convite é seu", code: "INVITE_SELF" }` |
| `GET /api/friends` | `{ friends: FriendSummary[] }` | |
| `DELETE /api/friends/:userId` | `{ ok: true }`, nos dois sentidos | 404 `{ error: "Não encontrado" }` |
| `GET /api/friends/:userId/shelf` | `{ friend: FriendUser, items: FriendBook[] }` | 404 `{ error: "Não encontrado" }` se não for amigo; nunca 403 |
| `GET /api/shelf/:id/friends` | `{ friends: FriendUser[] }`, amigos com o livro em `read` | 404 `{ error: "Não encontrado" }`, item não é meu |
| `GET /api/friends/badges` | `{ badges: Record<itemId, number> }`, só contagens > 0 | |

```ts
export interface FriendUser { id: string; name: string | null; picture: string | null }
export interface FriendBook { status: "reading" | "read"; readYear: number | null; book: Book }
export interface FriendSummary extends FriendUser { reading: FriendBook[] }
export interface FriendInvitePreview { inviter: FriendUser; alreadyFriends: boolean }
```

## amizades-1 · extrair `rowToBook` · interno
Refactor, comportamento igual. Em `server/routes/shelf.ts:29-39`, tire o objeto `book` de `rowToItem` para `export function rowToBook(r: any): Book`, lendo as mesmas colunas `b_*`. `rowToItem` passa a chamá-lo. Aceite (verde antes e depois): `npm test`.

## amizades-2 · schema e ciclo de convite · contrato
**`server/db.ts`**, dentro de `SCHEMA` (:6), só acrescente:
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
**`server/types.ts`:** os tipos acima. **`server/app.ts`:** `api.route("/", friendsRoutes(db))` depois de `adsRoutes` (:35), já sob `requireAuth`.

**`server/routes/friends.ts`:** `friendsRoutes(db)` no padrão de `statsRoutes` (`server/routes/stats.ts:5`), sem `onError` próprio. Rotas: `POST /api/friends/invites`, `GET /api/friends/invites/:code`, `POST /api/friends/invites/:code/accept`, `DELETE /api/friends/:userId`. Registre `GET /api/friends/invites/:code` **antes** de `GET /api/friends/:userId/shelf` (amizades-3): as duas têm a mesma profundidade.
- Código: `randomBytes(16).toString("base64url")`. `INVITE_TTL_MS` = 7 dias. Ao criar, apague os meus convites com `expires_at < Date.now()`, como `createSession` (`server/auth.ts:27`). Convites ativos convivem.
- Helpers: `areFriends(db, a, b)` e o par ordenado (`a < b ? [a, b] : [b, a]`).
- Uma função só, `resolveInvite(db, code, me)`, decide o estado do convite para as duas rotas, nesta ordem, para o `GET` nunca divergir do accept:
  1. código inexistente ou `expires_at <= Date.now()`: `invalid`;
  2. `inviter_id` sou eu: `self`;
  3. `used_by` sou eu: `already` se a amizade existe; `invalid` se foi desfeita;
  4. `used_by` é outro: `invalid`;
  5. já amigos: `already`;
  6. senão: `open`.
- `invalid` → 404 e `self` → 400 `INVITE_SELF` nas duas rotas.
- `GET`: `already` → 200 `{ inviter, alreadyFriends: true }`; `open` → 200 `{ inviter, alreadyFriends: false }`. **Nunca escreve no banco.**
- Accept, dentro de `transaction` (`server/db.ts:93`): `already` → 200, sem consumir; `open` → insere a amizade, grava `used_by`, 201. O passo 3 cobre toque duplo e repetição depois de queda de rede.
- `friend` e `inviter` com só `id`, `name`, `picture`. Não use `publicUser` (`server/auth.ts:228`): inclui e-mail.

`tests/friends-invites.test.ts` cobre, cada um com `assert`: os 6 passos acima **nas duas rotas**; `GET` repetido não consome: depois dele não há amizade (`GET /api/friends` vazio) e o accept ainda dá 201; `GET` de `open` e de `already` com `alreadyFriends` correto; `GET` por outro usuário depois do uso dá 404; segundo convidado no mesmo link recebe 404; reabrir depois de desfazer recebe 404; convite vencido recebe 404; sem sessão recebe 401 no `GET` e no accept; `DELETE` funciona dos dois lados e 404 para não amigo; respostas de `inviter` e `friend` sem a chave `email`; `GET` de `/api/shelf`, com amizade existente, segue sem itens do amigo.

Aceite: `node --test --import tsx tests/friends-invites.test.ts`.

## amizades-3 · lista de amigos e estante do amigo · contrato
Em `server/routes/friends.ts`: `GET /api/friends` e `GET /api/friends/:userId/shelf`.
- Colunas explícitas. **Não reutilize `SELECT_ITEM` nem `rowToItem`** (`server/routes/shelf.ts:10,18`): trazem `rating`, `review` e datas. Selecione `ub.status`, `ub.read_year` e as colunas `b_*` de `SELECT_ITEM` sem `description`, e use `rowToBook`.
- Filtro `ub.status IN ('reading','read')`; `GET /api/friends` traz em `reading` só `status = 'reading'`, numa consulta só (sem N+1). Ordem: `ub.updated_at DESC`; amigos por `name COLLATE NOCASE`.
- Lista de amigos: `WITH my_friends(id) AS (SELECT user_high FROM friendships WHERE user_low = ?1 UNION ALL SELECT user_low FROM friendships WHERE user_high = ?1)`.

`tests/friends-shelf.test.ts` cobre: amigo vê `reading` e `read`, e **não** vê `want` e `abandoned`; não amigo e ex-amigo recebem 404, igual a id inexistente; `JSON.stringify` das duas respostas não contém o texto da resenha, nem as chaves `rating`, `review`, `startedAt`, `finishedAt`, `description`, `email`; amizade vale nos dois sentidos.

Aceite: `node --test --import tsx tests/friends-shelf.test.ts`.

## amizades-4 · badge · contrato
Em `server/routes/friends.ts`: `GET /api/shelf/:id/friends` e `GET /api/friends/badges`. Mesmo livro = `book_id` igual ou `upper(isbn13)` igual; só `status = 'read'` do amigo; meu item em qualquer status.

**Nunca use `OR` entre `book_id` e ISBN no lote:** medido em 500 × 50 amigos × 500 lidos, leva ~6,5 s e trava o processo único. Use `UNION` (~15 ms):
```sql
WITH my_friends(id) AS (SELECT user_high FROM friendships WHERE user_low = ?1 UNION ALL SELECT user_low FROM friendships WHERE user_high = ?1),
mine AS (SELECT me.id AS item_id, mb.id AS book_id, upper(mb.isbn13) AS isbn FROM user_books me JOIN books mb ON mb.id = me.book_id WHERE me.user_id = ?1),
hits AS (
  SELECT m.item_id, fub.user_id FROM mine m JOIN user_books fub ON fub.book_id = m.book_id AND fub.status = 'read' JOIN my_friends f ON f.id = fub.user_id
  UNION
  SELECT m.item_id, fub.user_id FROM mine m JOIN books fb ON upper(fb.isbn13) = m.isbn AND fb.isbn13 IS NOT NULL JOIN user_books fub ON fub.book_id = fb.id AND fub.status = 'read' JOIN my_friends f ON f.id = fub.user_id WHERE m.isbn IS NOT NULL
)
SELECT item_id AS itemId, COUNT(*) AS count FROM hits GROUP BY item_id
```
`GET /api/shelf/:id/friends`: `getItem(db, c.var.user.id, id)` (`server/routes/shelf.ts:59`), 404 se nulo; mesma lógica de `UNION` restrita ao livro; devolve `FriendUser[]` sem repetir amigo, por `name COLLATE NOCASE`. A rota não colide com `GET /api/shelf/:id` nem `/details`. Não mude `shelfRoutes`.

`tests/friends-badges.test.ts` cobre:
- mesmo `book_id` (mesmo `source`+`sourceId` Google) casa;
- ISBN igual com fontes diferentes casa, e `x`/`X` casa;
- título e autor iguais sem ISBN **não** casam (decisão do dono);
- manual sem ISBN não casa;
- amigo em `reading`, `want`, `abandoned` não conta;
- quem não é amigo e ex-amigo não contam; eu não conto;
- amigo com o mesmo livro em duas linhas conta 1;
- item alheio → 404;
- `badges` sem chave para contagem 0; sem amigos, `{ badges: {} }`;
- `EXPLAIN QUERY PLAN` da consulta de lote cita `idx_books_isbn_upper` e `idx_user_books_book` (exporte a string SQL de `friends.ts`);

Aceite: `node --test --import tsx tests/friends-badges.test.ts`.
