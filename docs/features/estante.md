---
aliases: [estante, shelf, status, lendo, quero ler, lido, abandonado, nota, resenha]
---
# Estante e status

Quatro listas (Lendo, Quero ler, Lidos, Abandonados) mais "Ver todos", sem filtro de status e seleção padrão ao abrir o app; nota 1–5 e resenha por livro; mudar o status reconcilia datas e ano (README § Regras). Na tela do livro, nota, status, datas, ano e resenha ficam em rascunho no navegador e vão ao servidor num único `PATCH`, ao clicar em Salvar.

## Símbolos de entrada
`shelfRoutes` (`server/routes/shelf.ts`), `reconcile`, `getItem`, `findOrCreateBook`, `parseStatus` (`server/validate.ts`), `ShelfItem`/`Status` (`server/types.ts`), `ShelfPage`, `BookDetailPage`, `readDraft`, `writeDraft`, `changedFields` (`client/src/lib/itemDraft.ts`), `DateField`, `AddSheet`, `BookCard`, `useShelf`, `useAddToShelf`, `useUpdateItem`, `useRemoveItem`, tabela `user_books` (`server/db.ts`).

## Interações
- [busca](busca.md): o item nasce de um resultado de busca via `AddSheet`.
- [livro-manual](livro-manual.md): o item nasce de um cadastro manual.
- [historico-anos](historico-anos.md): `readYear` e `finishedAt` alimentam o histórico e as estatísticas.
- [anuncios](anuncios.md): `POST /api/shelf` exige `adUnlocked` quando `ADS_ENABLED=true`.
- [conta](conta.md): tudo filtrado por `user_id` da sessão.
- [comentarios](comentarios.md): comentários (privados ou públicos) e página atual na tela do livro; progresso no `BookCard`.
- [amigos](amigos.md): `BookCard` e a tela do livro mostram quais amigos já leram o livro; adicionar, mudar status, editar ISBN de livro manual e remover mudam o selo (`invalidateShelf` invalida `["friends","badges"]`).
