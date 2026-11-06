# cliente · amizades · onda W2 · porta 3102 · 5 itens · 15 arquivos (~640 + novos)
Contexto: amizades por link de convite (quem abre vê quem convidou e vira amigo com um toque de confirmar; o link sobrevive ao login), acompanhar o que amigos leem, e badge dos amigos que já leram um livro da minha estante. A faixa `servidor` entregou a API na W1. Decisões: badge só na tela do livro e nos cartões de Estante e Por ano, **nunca** na busca; `server/routes/search.ts`, `client/src/pages/Search.tsx` e `client/src/components/AddSheet.tsx` não mudam.
Dono de: `client/src/lib/hooks.ts` (96 linhas) `client/src/lib/pendingInvite.ts` (novo) `client/src/components/BottomNav.tsx` (32) `client/src/components/Icons.tsx` (45) `client/src/components/BookCard.tsx` (30) `client/src/components/FriendBadge.tsx` (novo) `client/src/pages/BookDetail.tsx` (159) `client/src/pages/Login.tsx` (71) `client/src/pages/Friends.tsx` (novo) `client/src/pages/FriendDetail.tsx` (novo) `client/src/pages/FriendInvite.tsx` (novo) `tests/pending-invite.test.ts` (novo). Pode tocar o mínimo de: —. União: `client/src/App.tsx` `client/src/lib/api.ts` `client/src/lib/types.ts`.
Par: `servidor` (produz o contrato na W1).

Não mexa em `README.md`, `docs/` ou `.claude/` (docs ficam para a fase 6). Sem teste de tela no repo: o caminho na tela é provado no QA visual final. Padrões: `Page`, `Spinner`, `Empty`, `ErrorBox` (`client/src/components/Layout.tsx`), `Sheet`, `toast`, classes `card`, `btn-primary`, `btn-secondary`, `btn-danger`.

## Contrato (a API já responde assim)
| Rota | Resposta | Erros |
|---|---|---|
| `POST /api/friends/invites` | `201 { code, expiresAt }` | |
| `GET /api/friends/invites/:code` | `{ inviter: FriendUser, alreadyFriends: boolean }`, sem consumir | 404 `{ error: "Convite inválido ou expirado" }`; 400 `{ error: "Este convite é seu", code: "INVITE_SELF" }` |
| `POST /api/friends/invites/:code/accept` | `201 { friend: FriendUser }` criou; `200` igual se já amigos | 404 `{ error: "Convite inválido ou expirado" }`; 400 `{ error: "Este convite é seu", code: "INVITE_SELF" }` |
| `GET /api/friends` | `{ friends: FriendSummary[] }` | |
| `DELETE /api/friends/:userId` | `{ ok: true }` | 404 `{ error: "Não encontrado" }` |
| `GET /api/friends/:userId/shelf` | `{ friend: FriendUser, items: FriendBook[] }` | 404 |
| `GET /api/shelf/:id/friends` | `{ friends: FriendUser[] }` | 404 |
| `GET /api/friends/badges` | `{ badges: Record<itemId, number> }` | |

```ts
export interface FriendUser { id: string; name: string | null; picture: string | null }
export interface FriendBook { status: "reading" | "read"; readYear: number | null; book: Book }
export interface FriendSummary extends FriendUser { reading: FriendBook[] }
export interface FriendInvitePreview { inviter: FriendUser; alreadyFriends: boolean }
```

## amizades-5 · tipos, chamadas, hooks e convite guardado · interno
- `client/src/lib/types.ts`: os tipos acima.
- `client/src/lib/api.ts`: métodos em `Api`. `invalidateShelf` (:57) ganha `queryClient.invalidateQueries({ queryKey: ["friends", "badges"] })`.
- `client/src/lib/hooks.ts`: `useFriends` (`["friends"]`), `useFriendShelf(id)` (`["friends","detail",id]`), `useBookFriends(itemId, enabled)` (`["friends","book",itemId]`, `retry: false`), `useFriendBadges()` (`["friends","badges"]`, `retry: false`), `useInvite(code)` (`["friends","invite",code]`, `retry: false`, chama `Api.invite(code)`), `useCreateInvite`, `useAcceptInvite`, `useRemoveFriend`. As mutações que mudam amizade invalidam o prefixo `["friends"]`. **Não use prefixo `["item"]`:** `invalidateShelf` refaria a chamada do badge e daria 404 durante a remoção do item. `useLogout` (:76) chama `clearPendingInvite` ao lado de `clearDrafts`.
- `client/src/lib/pendingInvite.ts`, puro, recebe o armazenamento por parâmetro (`tests/tsconfig.json` não tem DOM):
```ts
export interface InviteStore { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export const PENDING_INVITE_TTL_MS = 60 * 60 * 1000;
export function inviteCodeFromPath(pathname: string): string | null;            // "/amigos/convite/<code>"
export function savePendingInvite(store: InviteStore, code: string, now?: number): void;
export function readPendingInvite(store: InviteStore, now?: number): string | null;  // vencido ou corrompido: null, e remove
export function clearPendingInvite(store: InviteStore): void;
/** Logado: para onde redirecionar. null em rota de convite (qualquer código), sem guardado ou vencido. */
export function pendingInviteRedirect(store: InviteStore, pathname: string, now?: number): string | null;
```
Tudo em `try/catch`, como `client/src/lib/itemDraft.ts:9` (armazenamento pode falhar em modo privado). Chave `estante:convite`.

`tests/pending-invite.test.ts` importa `../client/src/lib/pendingInvite.ts` e usa um `Map` como armazenamento. Cobre: ida e volta; expira em `now + PENDING_INVITE_TTL_MS + 1`; JSON corrompido → `null`; `store` que lança → `null`, sem exceção; `inviteCodeFromPath` para o código, `/amigos`, `/amigos/x`, `/amigos/convite/` e `/amigos/convite/a/b`; `pendingInviteRedirect`: com `A` guardado em `/` dá `/amigos/convite/A`; em `/amigos/convite/A` e em `/amigos/convite/B` dá `null`; depois de `clearPendingInvite` em `/` dá `null` (sem laço).

Aceite: `node --test --import tsx tests/pending-invite.test.ts`. Rode também `npm run typecheck`.

## amizades-6 · abrir o link, confirmar e sobreviver ao login · interno
`RequireAuth` (`client/src/App.tsx:18`) é o único ponto, com `useLocation`:
- `me` carregando: spinner, como hoje.
- Deslogado: se `inviteCodeFromPath(pathname)`, `savePendingInvite(localStorage, code)`; depois `<Navigate to="/login" replace />`.
- Logado: `const to = pendingInviteRedirect(localStorage, pathname)`; se existe, `<Navigate to={to} replace />`.

Isso cobre Google (`server/auth.ts:183` redireciona para `/`) e dev (`client/src/pages/Login.tsx:22`). Não mude `server/auth.ts`.

`client/src/pages/FriendInvite.tsx`, rota lazy `/amigos/convite/:code`: `useInvite(code)` carrega quem convidou. **`useAcceptInvite` só roda no `onClick` de `Confirmar amizade`; nenhum `useEffect` chama o `POST`.**

Quando limpar o convite guardado: em `useEffect` ao montar, `clearPendingInvite(localStorage)`, sem esperar a confirmação. O guardado só serve para voltar do login; dali em diante o código está na URL, o recarregar funciona e o servidor não consumiu nada. Limpar só ao confirmar criaria laço: `Agora não` cairia em `/`, e `RequireAuth` redirecionaria de volta. Quem sair sem confirmar reabre o link original, que continua valendo.

Estados, textos exatos (`name` nulo: `Leitor(a)`; avatar como `client/src/pages/Profile.tsx:18-22`):
- Carregando: `Spinner`.
- `alreadyFriends: false`: avatar; `{nome} convidou você para ser amigo`; abaixo, `Ao confirmar, vocês veem o que o outro está lendo e já leu. Nota e resenha continuam privadas.`; botões `Confirmar amizade` e `Agora não` (`navigate("/", { replace: true })`, sem chamada à API).
- Depois do toque: `Agora você e {nome} são amigos`; botão `Ver o que {nome} lê` (`/amigos/:id`). Desfazer fica em `FriendDetail`. Este estado tem prioridade sobre a refetch de `useInvite`.
- `alreadyFriends: true`: `Você e {nome} já são amigos`; botão `Ver o que {nome} lê`.
- 400 `INVITE_SELF` (`ApiError.code`): `Este convite é seu`; abaixo, `Envie o link para um amigo.`
- 404 (`ApiError.status`), no `GET` ou no toque, se outra pessoa usou antes: `Convite inválido ou expirado`; abaixo, `Peça um novo link a quem convidou.`
- Outro erro no `GET` (offline): `ErrorBox` com `retry`. No toque: toast com a mensagem, botões seguem ativos.

`client/src/pages/Login.tsx`: se `readPendingInvite(localStorage)`, mostre acima dos botões `Entre para ver o convite de amizade.`

Aceite: `npm run typecheck && grep -qF 'path="/amigos/convite/:code"' client/src/App.tsx && grep -qF 'pendingInviteRedirect' client/src/App.tsx && grep -qF 'Confirmar amizade' client/src/pages/FriendInvite.tsx && grep -qF 'useInvite' client/src/pages/FriendInvite.tsx && grep -qF 'Entre para ver o convite de amizade.' client/src/pages/Login.tsx`.

## amizades-7 · telas de amigos e aba · interno
- `client/src/components/Icons.tsx`: `IconFriends`. `client/src/components/BottomNav.tsx` (`ITEMS`, :4): `{ to: "/amigos", label: "Amigos", Icon: IconFriends }`, antes de Perfil. Sem contador e sem query em `BottomNav`.
- `client/src/App.tsx`: rotas lazy `/amigos`, `/amigos/:id`.
- `client/src/pages/Friends.tsx` (título `Amigos`): botão `Convidar amigo` → `useCreateInvite` → URL `${location.origin}/amigos/convite/${code}`; `navigator.share` se existir (cancelar não é erro), senão `navigator.clipboard.writeText` com toast `Link copiado`, senão campo só de leitura com a URL. Abaixo, `O link vale para uma pessoa, por 7 dias. Quem confirmar vira seu amigo e vocês veem o que o outro está lendo e já leu.` Lista: avatar (`referrerPolicy="no-referrer"`, inicial como `client/src/pages/Profile.tsx:18-22`), nome (`Leitor(a)` se nulo), títulos em `reading` ou `Sem leitura no momento`; toque leva a `/amigos/:id`. Vazio: `Empty` com título `Nenhum amigo ainda`.
- `client/src/pages/FriendDetail.tsx`: `useFriendShelf`; seções `Lendo` e `Lidos` (com `readYear`), com `BookCover` e `formatAuthors`. **Não use `BookCard`:** o link dele para `/livro/:id` daria 404. Sem nota, resenha ou datas. `Sheet` de confirmação `Desfazer amizade` (`useRemoveFriend`, toast `Amizade desfeita`), depois `/amigos`. 404: `ErrorBox`.

Aceite: `npm run build >/dev/null && grep -qF 'to: "/amigos"' client/src/components/BottomNav.tsx && grep -qF 'path="/amigos/:id"' client/src/App.tsx && grep -qF 'Quem confirmar vira seu amigo' client/src/pages/Friends.tsx && grep -qF 'useFriendShelf' client/src/pages/FriendDetail.tsx`.

## amizades-8 · badge na tela do livro e nos cartões · interno
- `client/src/components/FriendBadge.tsx`: recebe `itemId`, usa `useBookFriends`. Erro, carregando ou lista vazia: `null`, sem layout. Até 3 avatares e o texto: `Ana já leu`, `Ana e João já leram`, `Ana, João e mais 2 já leram`. Nome tocável leva a `/amigos/:id`.
- `client/src/pages/BookDetail.tsx`: `<FriendBadge itemId={item.id} />` depois da seção da capa (:83), sem participar do rascunho.
- `client/src/components/BookCard.tsx`: `useFriendBadges()` dentro do componente (React Query deduplica); na linha `flex-wrap` (:15-25), chip no estilo da linha :19: `1 amigo leu`, `2 amigos leram`. Sem contagem: nada.

Aceite: `npm run typecheck && grep -qF 'FriendBadge' client/src/pages/BookDetail.tsx && grep -qF 'useFriendBadges' client/src/components/BookCard.tsx && git diff --exit-code eacf10e -- server/routes/search.ts client/src/pages/Search.tsx client/src/components/AddSheet.tsx`.

## amizades-9 · texto público do login · interno
`client/src/pages/Login.tsx:67`: a frase atual fica falsa. Troque só o texto, mantendo a tag e as classes, por `Seus dados ficam na sua conta. Amigos veem só o que você está lendo e já leu.`. Cada afirmação é garantida por: "amigos veem" e "só" = `friendsRoutes` em `server/routes/friends.ts` (404 sem amizade; projeção de `FriendBook`, provada em `tests/friends-shelf.test.ts`).

Aceite: `grep -qF '>Seus dados ficam na sua conta. Amigos veem só o que você está lendo e já leu.</p>' client/src/pages/Login.tsx`.
