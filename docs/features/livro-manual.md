---
aliases: [cadastro manual, adicionar manual, isbn, livro manual]
---
# Cadastro manual

Cadastro de livro sem fonte externa (título, autores, páginas, ano, ISBN); a capa é derivada do ISBN na Open Library ou vira placeholder.

## Símbolos de entrada
`AddManualPage` (`client/src/pages/AddManual.tsx`, rota `/adicionar`), `parseBookInput` (`server/validate.ts`), fonte `manual` em `BookSource`, `coverUrlFor`, `PATCH /api/shelf/:id` com `book` (só para livros manuais).

## Interações
- [estante](estante.md): mesmo `POST /api/shelf` e `findOrCreateBook`.
- [anuncios](anuncios.md): criação passa pelo gate.
