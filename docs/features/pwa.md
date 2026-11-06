---
aliases: [pwa, manifest, service worker, twa, play store, assetlinks, android]
---
# PWA e app Android

Instalável como app (manifest + service worker); publicação na Play Store via Trusted Web Activity (Bubblewrap/PWABuilder) ou app nativo usando a mesma API.

## Símbolos de entrada
`client/public/manifest.webmanifest`, service worker e ícones em `client/public/`, `client/public/.well-known/assetlinks.json`, SPA fallback e `serveStatic` em `server/index.ts`, `isApiPath` (`server/app.ts`).

## Interações
- [busca](busca.md): `sw.js` guarda as capas externas no cache `estante-covers` (até 300) e as revalida em segundo plano.
- [conta](conta.md): login dentro da TWA usa a sessão normal; app nativo troca `idToken` em `POST /auth/google/token`.
