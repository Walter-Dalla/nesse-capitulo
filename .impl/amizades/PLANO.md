# Amizades e badge de amigos · 2026-11-06
Pedido: sistema de adicionar amizades para acompanhar o que os amigos estão lendo, e badge dos livros que amigos já leram, validado depois de adicionar o livro, não na pesquisa.
Enriquecido: gero um link de convite; quem abre vê quem convidou e vira meu amigo com um toque de confirmar; o link sobrevive ao login. Aba Amigos mostra o que cada amigo está lendo; a tela do amigo mostra Lendo e Lidos, sem nota, resenha ou datas. Depois que o livro está na minha estante, a tela dele e os cartões de Estante e Por ano mostram quais amigos já o leram, por `book_id` ou ISBN. Busca não muda. Análise: ANALISE.md.

Decisões:
- **Dono, P1:** link de convite; precisa sobreviver ao login.
- **Dono: toque de confirmação:** a tela do convite mostra quem convidou e só vira amigo depois de um toque em confirmar. Substitui "quem abre vira amigo" de P1. Exige `GET /api/friends/invites/:code`, que não consome o convite.
- **Dono, P2:** `book_id` ou ISBN, sem título + autor. Edição diferente e manual sem ISBN não casam.
- **Dono, P3:** tela do livro + cartões de Estante e Por ano.
- **Dono, P4:** `docs/MONETIZACAO.md:54` não é violado; regra comercial, amigos consentem.
- **Orquestrador:** base `main` @ eacf10e; docs protegidos (`README.md`, `docs/GLOSSARIO.md`, `docs/features/*`) ficam para a fase 6, fora das faixas.
- **Enriquecedor:** convite de uso único, 7 dias: link vazado vale para uma pessoa só. Convite guardado no aparelho por 1 h e limpo no logout: outra pessoa no mesmo aparelho não vira amiga. Convite guardado é limpo ao chegar à tela do convite, não ao confirmar: o código fica na URL, e `Agora não` não cai em laço. Amigo vê só Lendo e Lidos; badge conta só `read`; nota, resenha e e-mail ficam fora do contrato. Sem bloqueio e sem push. Lote de badge com `UNION` e dois índices: `OR` medido em ~6,5 s no caso extremo, contra ~15 ms.

Tamanho: **grande** (cliente + servidor unidos por contrato, formato persistido, 24 arquivos).

| Id | Item | Arquivos (símbolo) | Tipo | Aceite (comando) |
|---|---|---|---|---|
| amizades-1 | Extrair `rowToBook` (refactor; ANALISE § Privacidade) | `server/routes/shelf.ts` (`rowToItem`, `rowToBook`) | interno | `npm test` (verde antes e depois) |
| amizades-2 | Schema e ciclo de convite, com `GET` que não consome (ANALISE § Schema, § Contrato, § Convite) | `server/db.ts` (`SCHEMA`), `server/types.ts` (`FriendUser`, `FriendBook`, `FriendSummary`), `server/app.ts` (`createApp`), `server/routes/friends.ts` (novo, `friendsRoutes`), `tests/friends-helpers.ts` (novo), `tests/friends-invites.test.ts` (novo) | contrato | `node --test --import tsx tests/friends-invites.test.ts` |
| amizades-3 | Lista de amigos e estante do amigo (ANALISE § Privacidade) | `server/routes/friends.ts`, `tests/friends-shelf.test.ts` (novo) | contrato | `node --test --import tsx tests/friends-shelf.test.ts` |
| amizades-4 | Rotas de badge (ANALISE § Mesmo livro e custo) | `server/routes/friends.ts`, `tests/friends-badges.test.ts` (novo) | contrato | `node --test --import tsx tests/friends-badges.test.ts` |
| amizades-5 | Tipos, chamadas, hooks e convite guardado (ANALISE § Cliente, § Convite) | `client/src/lib/types.ts`, `client/src/lib/api.ts` (`Api`, `invalidateShelf`), `client/src/lib/hooks.ts` (`useLogout`, `useInvite`, hooks novos), `client/src/lib/pendingInvite.ts` (novo, `pendingInviteRedirect`), `tests/pending-invite.test.ts` (novo) | interno | `node --test --import tsx tests/pending-invite.test.ts`, mais `npm run typecheck` |
| amizades-6 | Abrir o link, confirmar e sobreviver ao login (ANALISE § Convite) | `client/src/App.tsx` (`RequireAuth`), `client/src/pages/FriendInvite.tsx` (novo), `client/src/pages/Login.tsx` (`LoginPage`) | interno | ver `.impl/amizades/cliente.md` § amizades-6 |
| amizades-7 | Telas de amigos e aba (ANALISE § Comportamento) | `client/src/components/Icons.tsx`, `client/src/components/BottomNav.tsx` (`ITEMS`), `client/src/App.tsx`, `client/src/pages/Friends.tsx` (novo), `client/src/pages/FriendDetail.tsx` (novo) | interno | ver `.impl/amizades/cliente.md` § amizades-7 |
| amizades-8 | Badge na tela do livro e nos cartões (ANALISE § Cliente) | `client/src/components/FriendBadge.tsx` (novo), `client/src/pages/BookDetail.tsx` (`BookDetailPage`), `client/src/components/BookCard.tsx` (`BookCard`) | interno | ver `.impl/amizades/cliente.md` § amizades-8; inclui `git diff --exit-code eacf10e` de busca e `AddSheet` |
| amizades-9 | Texto público do login (ANALISE § Privacidade) | `client/src/pages/Login.tsx` | interno | `grep -qF` da frase inteira, em `.impl/amizades/cliente.md` § amizades-9 |

| Onda | Faixa | Itens | Porta | Arquivos (linhas) |
|---|---|---|---|---|
| W1 | `servidor` | amizades-1 a 4 | 3101 | `server/routes/shelf.ts` (226), `server/db.ts` (103), `server/types.ts` (60), `server/app.ts` (44), + 5 novos |
| W2 | `cliente` | amizades-5 a 9 | 3102 | `client/src/pages/BookDetail.tsx` (159), `client/src/lib/hooks.ts` (96), `client/src/lib/types.ts` (95), `client/src/pages/Login.tsx` (71), `client/src/lib/api.ts` (63), `client/src/App.tsx` (47), `client/src/components/Icons.tsx` (45), `client/src/components/BottomNav.tsx` (32), `client/src/components/BookCard.tsx` (30), + 6 novos |

Aceite na ponta, `main` @ eacf10e: arquivos de teste novos ausentes, exit 1 (medido em `friends-invites`, `friends-shelf`, `friends-badges`, `pending-invite`). `amizades-1` é refactor: `npm test` verde na ponta (13 pass), como esperado. Aceites por `grep` dos itens 6 a 9 conferem texto e rotas ainda inexistentes.

QA visual final, com dois usuários dev:
1. Deslogado abre o link, entra (porta do QA; `Entrar sem Google`) e cai na tela do convite com o nome de quem convidou; `Agora não` vai para a Estante sem voltar para o convite; reabrir o link ainda funciona.
2. Logado abre o link e vê quem convidou; **até o toque não há amizade** (`GET /api/friends` vazio dos dois lados); recarregar não muda isso; `Confirmar amizade` cria a amizade; reabrir mostra `Você e {nome} já são amigos`; terceiro usuário recebe `Convite inválido ou expirado`.
3. Dono do link vê `Este convite é seu`.
4. Desfazer amizade: a tela do amigo passa a dar erro e o badge some.
5. Adicionar livro com o mesmo `sourceId` do amigo, em `read`: badge na tela do livro e no cartão de Estante e Por ano; nenhuma chamada a `/api/friends*` por resultado na tela Buscar.
6. 5 abas em 360 px.

Notas para a fase 6 (docs): `README.md § API` e linha 10; `docs/GLOSSARIO.md`, inclusive `:33` (sinopse "nunca persistida" está desatualizada); feature nova `docs/features/amigos.md` com interações em `estante.md`, `conta.md`, `historico-anos.md`; `_comum § Navegação` diz que `.codegraph/` não existe. Pendência do dono: formulário de dados da Play Store.
