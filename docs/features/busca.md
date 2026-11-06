---
aliases: [busca, buscar, autocompletar, google books, open library, capa, sinopse]
---
# Busca e autocompletar

Autocompletar com Google Books e Open Library como reserva; debounce de 1 s (Enter pesquisa na hora), mínimo 3 letras, cache de 10 min, rajada de 5 e depois 1/s por usuário. Capas não vão para o servidor; sinopse é gravada em `books.description` na primeira consulta à fonte. Capa e sinopse ficam no cache do navegador.

## Símbolos de entrada
`searchRoutes`, `searchBooks`, `normalizeVolume`, `normalizeOpenLibraryDoc`, `fetchDetails`, `allowSearch`, `makeCache` (`server/routes/search.ts`), `SearchPage`, `useSearch`, `useDebounced`, `SEARCH_DEBOUNCE_MS`, `SEARCH_MIN_CHARS`, `useDetails` (`client/src/lib/hooks.ts`), `loadDetails`, `preloadCovers`, `clearBookCaches` (`client/src/lib/bookCache.ts`), `coverUrlFor` (`client/src/lib/format.ts`), `BookCover`.

## Interações
- [estante](estante.md): resultado vira `BookInput` para `POST /api/shelf`; sinopse via `GET /api/shelf/:id/details`.
- [conta](conta.md): rate limit é por `user.id` da sessão; sair da conta limpa os caches de capa e sinopse.
- [pwa](pwa.md): o service worker guarda as capas externas.
