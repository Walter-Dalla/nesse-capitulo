---
aliases: [cadastro manual, adicionar manual, isbn, livro manual]
---
# Cadastro manual

Cadastro de livro sem fonte externa (título, autores, páginas, ano, ISBN); a capa é derivada do ISBN na Open Library ou vira placeholder.

## Símbolos de entrada
`AddManualPage` (`client/src/pages/AddManual.tsx`, rota `/adicionar`), `parseBookInput` (`server/validate.ts`), fonte `manual` em `BookSource`, `coverUrlFor`, `PATCH /api/shelf/:id` com `book` (só para livros manuais).

## Regras
- Livro manual nunca é reaproveitado: quando some o último item que aponta para ele (remoção do item ou exclusão da conta), o gatilho `trg_user_books_manual_orphan` (`server/db.ts`) apaga a linha de `books`; `migrate` limpa os órfãos de antes do gatilho.

## Interações
- [estante](estante.md): mesmo `POST /api/shelf` e `findOrCreateBook`.
- [anuncios](anuncios.md): criação passa pelo gate.
- [conta](conta.md): excluir a conta leva os livros manuais pelo gatilho.
