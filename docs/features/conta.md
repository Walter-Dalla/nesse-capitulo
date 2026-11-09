---
aliases: [login, google, oauth, sessão, cookie, logout, usuário, perfil, termos, aceite, excluir conta, banido]
---
# Conta e sessão

Login com Google (fluxo web e `idToken` nativo), login dev fora de produção, sessão em cookie `HttpOnly` `sid` por 30 dias. Depois do login, quem ainda não aceitou a versão vigente dos termos vê o `TermsGate` no lugar do app. No Perfil ficam os links de privacidade e termos e a exclusão da conta.

## Símbolos de entrada
`authRoutes`, `requireAuth`, `createSession`, `findSession`, `upsertGoogleUser`, `decodeIdToken`, `verifyIdTokenRemote`, `verifiedEmail`, `publicUser` (`server/auth.ts`), `env.google`, `allowDevLogin`, `googleLoginEnabled` (`server/env.ts`), tabelas `users`/`sessions` (`server/db.ts`), `accountRoutes` (`server/routes/account.ts`: exclusão e aceite), `TERMS_VERSION`, `hasAcceptedTerms`, `TERMS_REQUIRED` (`server/terms.ts`), `LoginPage`, `ProfilePage`, `RequireAuth` (`client/src/App.tsx`), `TermsGate`, `useMe`, `useProviders`, `useLogout`, `useAcceptTerms`, `useDeleteAccount`.

## Regras
- E-mail só é gravado se o Google o declara verificado (`email_verified`, em `verifiedEmail`): sem isso uma conta poderia assumir o e-mail do moderador.
- `/api/me` devolve também `termsAccepted` e `isModerator` (falsos sem sessão).
- Aceite: `POST /api/terms/accept` grava `terms_version` e `terms_accepted_at`; aceitar de novo a mesma versão mantém a data do primeiro aceite. Subir `TERMS_VERSION` pede novo aceite a todos.
- Sem aceite, o servidor responde 403 `TERMS_REQUIRED` só ao que expõe a pessoa a outros: comentário público e convite (criar e aceitar). O resto do app funciona pela API.
- `RequireAuth` mostra o `TermsGate` em toda rota logada, menos `/perfil`, para quem recusa poder excluir a conta. O gate vem antes do convite guardado.
- Excluir conta (`DELETE /api/account`): apaga a linha de `users`; as chaves estrangeiras levam sessões, estante, comentários, amizades, convites, bloqueios e denúncias contra a pessoa; o gatilho `trg_user_books_manual_orphan` apaga os livros manuais que ficaram sem item. Denúncia feita pela pessoa fica, sem `reporter_id`.
- Conta banida (`users.banned_at`): `findSession` ignora as sessões dela; o login web volta a `/login?error=banned`, `/auth/google/token` e `/auth/dev` dão 403 `ACCOUNT_BANNED`.

## Interações
- [idioma](idioma.md): `LanguageSwitch` no Login e no Perfil; no login dev sem nome digitado, o e-mail fica fixo em `leitor.a.` em todo idioma, mas o nome salvo segue `base.reader`.
- [estante](estante.md), [busca](busca.md), [historico-anos](historico-anos.md): todas as rotas `/api/*` passam por `requireAuth`.
- [anuncios](anuncios.md): `adUnlocked` vive na sessão.
- [pwa](pwa.md): login nativo via `POST /auth/google/token` e `GOOGLE_EXTRA_CLIENT_IDS`.
- [amigos](amigos.md): `RequireAuth` guarda o convite de quem abre o link deslogado e volta a ele depois do login (e do aceite); `useLogout` limpa o convite guardado; o texto público do login diz o que amigos veem; convite exige aceite.
- [comentarios](comentarios.md): comentário público exige aceite.
- [legal](legal.md): Login e Perfil linkam `/privacidade`, `/termos` e `/excluir-conta`; o texto da política descreve a exclusão daqui.
- [moderacao](moderacao.md): o banimento vem de lá; `isModerator` mostra o link de moderação no Perfil.
- [livro-manual](livro-manual.md): livro manual sem item sai do banco pelo gatilho.
