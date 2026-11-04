---
aliases: [login, google, oauth, sessão, cookie, logout, usuário, perfil]
---
# Conta e sessão

Login com Google (fluxo web e `idToken` nativo), login dev fora de produção, sessão em cookie `HttpOnly` `sid` por 30 dias.

## Símbolos de entrada
`authRoutes`, `requireAuth`, `createSession`, `findSession`, `upsertGoogleUser`, `decodeIdToken`, `verifyIdTokenRemote`, `publicUser` (`server/auth.ts`), `env.google`, `allowDevLogin`, `googleLoginEnabled` (`server/env.ts`), tabelas `users`/`sessions` (`server/db.ts`), `LoginPage`, `ProfilePage`, `RequireAuth` (`client/src/App.tsx`), `useMe`, `useProviders`, `useLogout`.

## Interações
- [estante](estante.md), [busca](busca.md), [historico-anos](historico-anos.md): todas as rotas `/api/*` passam por `requireAuth`.
- [anuncios](anuncios.md): `adUnlocked` vive na sessão.
- [pwa](pwa.md): login nativo via `POST /auth/google/token` e `GOOGLE_EXTRA_CLIENT_IDS`.
