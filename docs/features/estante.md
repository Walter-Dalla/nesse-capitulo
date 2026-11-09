---
aliases: [estante, shelf, status, lendo, quero ler, lido, abandonado, nota, resenha]
---
# Estante e status

Quatro listas (Lendo, Quero ler, Lidos, Abandonados) mais "Ver todos", sem filtro de status e seleção padrão ao abrir o app. Em "Ver todos" os cartões vêm agrupados por status (`STATUS_GROUP`, "Lendo agora" sempre no topo) e com um selo colorido (`STATUS_BADGE`, mesmo vocabulário dos filtros); os filtros ficam em uma linha com rolagem horizontal e o botão de adicionar é o "+" no cabeçalho (não há botão flutuante). Cartões em Lendo têm "+ Página", que abre `PageSheet` (−10/+10, "Terminei o livro" marca como Lido com a data de hoje) sem abrir a tela do livro; nota 1–5 e resenha por livro; mudar o status reconcilia datas e ano (README § Regras). Na tela do livro, nota, status, datas, ano e resenha ficam em rascunho no navegador e vão ao servidor num único `PATCH`, ao clicar em Salvar; a barra Salvar/Cancelar é fixa acima da navegação, com fundo, e a ação de remover fica à direita do cabeçalho.

Adicionar à estante (`AddSheet`, a partir da busca ou do cadastro manual) é em dois passos: nada vem marcado e tocar em um status já cria o item (`POST`). "Quero ler" fecha a folha na hora e um aviso oferece "Ver livro"; os outros status abrem o passo 2 na mesma folha com os campos opcionais daquele status (Lendo: comecei em, já com hoje, e página; Lido: ano, data e nota; Abandonado: página em que parou). "Concluir" (fica onde estava), "Ver livro" e fechar mandam o que foi preenchido num `PATCH`; "trocar" volta ao passo 1 e muda o status do mesmo item, sem duplicar.

## Símbolos de entrada
`shelfRoutes` (`server/routes/shelf.ts`), `reconcile`, `getItem`, `findOrCreateBook`, `parseStatus` (`server/validate.ts`), `ShelfItem`/`Status` (`server/types.ts`), `ShelfPage`, `BookDetailPage`, `readDraft`, `writeDraft`, `changedFields` (`client/src/lib/itemDraft.ts`), `DateField`, `AddSheet`, `PageSheet`, `BookCard`, `STATUS_BADGE`/`STATUS_GROUP` (`client/src/lib/types.ts`), `updatedAgoText` (`client/src/lib/format.ts`), `TAB_PATHS` (`client/src/components/Layout.tsx`: abas da barra inferior não têm seta de voltar), `useShelf`, `useAddToShelf`, `useUpdateItem`, `useUpdateAnyItem`, `useRemoveItem`, `toast` com ação (`client/src/components/Toast.tsx`), tabela `user_books` (`server/db.ts`).

## Interações
- [busca](busca.md): o item nasce de um resultado de busca via `AddSheet`.
- [livro-manual](livro-manual.md): o item nasce de um cadastro manual.
- [historico-anos](historico-anos.md): `readYear` e `finishedAt` alimentam o histórico e as estatísticas.
- [anuncios](anuncios.md): `POST /api/shelf` exige `adUnlocked` quando `ADS_ENABLED=true`.
- [conta](conta.md): tudo filtrado por `user_id` da sessão.
- [comentarios](comentarios.md): comentários (privados ou públicos) e página atual na tela do livro; progresso no `BookCard`.
- [amigos](amigos.md): `BookCard` e a tela do livro mostram quais amigos já leram o livro; adicionar, mudar status, editar ISBN de livro manual e remover mudam o selo (`invalidateShelf` invalida `["friends","badges"]`).
