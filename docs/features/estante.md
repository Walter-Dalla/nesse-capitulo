---
aliases: [estante, shelf, status, lendo, quero ler, lido, abandonado, nota, resenha]
---
# Estante e status

Quatro listas (Lendo, Quero ler, Lidos, Abandonados), nota 1–5 e resenha por livro; mudar o status reconcilia datas e ano (README § Regras).

## Símbolos de entrada
`shelfRoutes` (`server/routes/shelf.ts`), `reconcile`, `getItem`, `findOrCreateBook`, `parseStatus` (`server/validate.ts`), `ShelfItem`/`Status` (`server/types.ts`), `ShelfPage`, `BookDetailPage`, `AddSheet`, `BookCard`, `useShelf`, `useAddToShelf`, `useUpdateItem`, `useRemoveItem`, tabela `user_books` (`server/db.ts`).

## Interações
- [busca](busca.md): o item nasce de um resultado de busca via `AddSheet`.
- [livro-manual](livro-manual.md): o item nasce de um cadastro manual.
- [historico-anos](historico-anos.md): `readYear` e `finishedAt` alimentam o histórico e as estatísticas.
- [anuncios](anuncios.md): `POST /api/shelf` exige `adUnlocked` quando `ADS_ENABLED=true`.
- [conta](conta.md): tudo filtrado por `user_id` da sessão.
