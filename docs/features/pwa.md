---
aliases: [pwa, manifest, service worker, twa, play store, assetlinks, android]
---
# PWA e app Android

Instalável como app (manifest + service worker); publicação na Play Store via Trusted Web Activity (Bubblewrap/PWABuilder) ou app nativo usando a mesma API.

## Símbolos de entrada
`client/public/manifest.webmanifest`, service worker e ícones em `client/public/`, `client/public/.well-known/assetlinks.json`, SPA fallback e `serveStatic` em `mountClient` (`server/html.ts`), `isApiPath` (`server/app.ts`).

## Interações
- [idioma](idioma.md): o fallback offline é a última página guardada, no idioma dela; o manifest é só em EN.
- [busca](busca.md): `sw.js` guarda as capas externas no cache `estante-covers` (até 300) com data em `estante-covers-meta`: capa da Open Library por id nunca revalida; as outras (ISBN, Google) revalidam a cada 30 dias.
- [conta](conta.md): login dentro da TWA usa a sessão normal; app nativo troca `idToken` em `POST /auth/google/token`.
- [legal](legal.md): `sw.js` (`NOT_APP_SHELL`) não grava `/privacidade`, `/termos` e `/excluir-conta` como o `/` do app shell; a Play Console pede as URLs da política e da exclusão de conta.
