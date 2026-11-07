# Convite sem validade, comentários e página atual · 2026-11-07

Pedido do dono: o convite nunca deve expirar; usuários podem comentar nos livros, deixando cada comentário público ou privado; usuários podem informar a página atual em que estão.

## Entregue
| Melhoria | O que mudou | Testes |
|---|---|---|
| Convite sem validade | `friend_invites` perde `expires_at` (migração derruba a coluna em bancos antigos e os convites vencidos voltam a valer); `POST /api/friends/invites` devolve só `{ code }`; mensagem passa a "Convite inválido ou já usado". Continua de uso único. | `tests/friends-invites.test.ts` (convite antigo vale, migração) |
| Página atual | `user_books.current_page`; `currentPage` no `POST`/`PATCH /api/shelf`; só em Lendo e Abandonado, limpa em Quero ler e Lido. Campo "Estou na página"/"Parei na página" com percentual na tela do livro; "Pág. X de Y · Z%" e barra no cartão; amigos veem o progresso de quem está lendo. | `tests/progress.test.ts`, `tests/format.test.ts` |
| Comentários | tabela `book_comments` (privado ou público, cascata ao remover o livro); rotas em `server/routes/comments.ts`; seção Comentários na tela do livro (criar, editar, trocar visibilidade, apagar) e "Comentários de amigos"; públicos também na tela do amigo. | `tests/comments.test.ts` |

Suíte: `# pass 66 / # fail 0`; `npm run typecheck` e `npm run build` limpos.

## QA visual (Playwright, 360 px, `node dist/server/index.js`)
19 de 19 verificações, sem erro de página: texto "O link não expira" na aba Amigos; `POST` devolve só o código; link usado mostra "Convite inválido ou já usado"; página 120 de 300 mostra 40% e é salva; cartão com barra; comentário privado e público criados; amiga com o mesmo livro vê só o público, na tela do livro e na tela da amiga; "Lendo Sapiens (40%)" na aba Amigos; "Tornar privado" tira o comentário da vista da amiga; editar e apagar; campo de página some em Lido; sem rolagem horizontal.

## Decisões
- "Público" = amigos. Não há área para estranhos no app; comentários públicos não aparecem para quem não é amigo.
- Comentário público de amigo aparece na tela do meu livro em qualquer status da estante dele; na tela do amigo, só nos livros em Lendo e Lidos (os únicos listados ali).
- A resenha continua uma só e sempre privada; comentários são uma coisa à parte.
- O convite guardado no aparelho durante o login continua valendo 1 h (proteção para aparelho compartilhado); o link em si não expira e pode ser reaberto.
- Textos públicos atualizados: login, tela do convite e aba Amigos dizem que amigos veem os comentários públicos.
