---
aliases: [busca, buscar, autocompletar, google books, open library, capa, sinopse]
---
# Busca e autocompletar

Autocompletar com Google Books e Open Library como reserva; debounce de 1 s (Enter pesquisa na hora), mínimo 3 letras, cache de 10 min, rajada de 5 e depois 1/s por usuário. Capas não vão para o servidor; sinopse é gravada em `books.description` na primeira consulta à fonte. Capa e sinopse ficam no cache do navegador. Cada resultado tem o link "Ver no Google Books" (ou Open Library), que abre em nova aba sem abrir a folha de adicionar; a tela do livro tem o mesmo link, menos no cadastro manual. O rodapé da busca atribui a fonte.

## Símbolos de entrada
`searchRoutes`, `searchBooks`, `normalizeVolume`, `normalizeOpenLibraryDoc`, `fetchDetails`, `allowSearch`, `makeCache` (`server/routes/search.ts`), `SearchPage`, `useSearch`, `useDebounced`, `SEARCH_DEBOUNCE_MS`, `SEARCH_MIN_CHARS`, `useDetails` (`client/src/lib/hooks.ts`), `loadDetails`, `preloadCovers`, `clearBookCaches` (`client/src/lib/bookCache.ts`), `coverUrlFor`, `bookSourceUrl`, `searchAttribution` (`client/src/lib/format.ts`), `BookCover`; `USER_AGENT` com `CONTACT_EMAIL` (`server/contact.ts`).

## Regras
- `searchAttribution` decide o rodapé pela fonte, nunca pela contagem: "via Open Library" só com resultados dela; nada quando ela volta vazia ou a busca falha; "Powered by Google" no resto, inclusive antes da primeira busca.
- O cache de busca guarda a fonte junto da lista (`{ items, provider }`): lista vazia da Open Library não volta do cache como Google.
- As chamadas a Google Books e Open Library levam User-Agent com o nome do app e o e-mail de contato.

## Interações
- [estante](estante.md): resultado vira `BookInput` para `POST /api/shelf`; sinopse via `GET /api/shelf/:id/details`.
- [conta](conta.md): rate limit é por `user.id` da sessão; sair da conta limpa os caches de capa e sinopse.
- [pwa](pwa.md): o service worker guarda as capas externas.
- [legal](legal.md): o e-mail do User-Agent é o mesmo `CONTACT_EMAIL` das páginas legais.
