---
aliases: [privacidade, política de privacidade, termos, termos de uso, excluir conta, exclusão de conta, lgpd, play store, contato]
---
# Páginas legais

Três páginas públicas, sem login e sem JS, exigidas pela Google Play: `/privacidade`, `/termos` e `/excluir-conta`. Renderizadas no servidor nos 3 idiomas, com seletor de idioma, link de volta à home e rodapé com as outras duas páginas e o e-mail de contato. A Play abre essas URLs de fora do app, por isso não são rotas da SPA.

## Símbolos de entrada
`legalRoutes` (`server/routes/legal.ts`), montado antes da API em `createApp`; `LEGAL_PATHS`, `LEGAL_TEXT`, `renderLegal` (`server/legalText.ts`); `APP_NAME`, `DEVELOPER_NAME`, `CONTACT_EMAIL` (`server/contact.ts`); `respondNegotiated` (`server/localeResponse.ts`).

## Regras
- Cada frase de `server/legalText.ts` corresponde a uma regra do código ou decisão do dono: mudou a regra, muda o texto nos 3 idiomas. Exemplos: a exclusão descreve `DELETE /api/account` e o gatilho de livros manuais; a política afirma que não há anúncios (vale enquanto `ADS_ENABLED=false`); `backupRetention` afirma até 30 dias em backups.
- Contato e desenvolvedor são constantes em `server/contact.ts`, não env: env vazia publicaria política sem contato.
- As páginas são geradas uma vez por idioma no boot; `baseUrl` entra só no canonical e no `hreflang`.
- O texto é rascunho até a revisão legal do dono (`docs/PENDENCIAS.md`).

## Interações
- [seo](seo.md): as três estão em `PUBLIC_PATHS` (sitemap, `Allow`, `llms.txt`); a home linka privacidade e termos no rodapé.
- [idioma](idioma.md): mesma negociação do resto do HTML (`?lang=`, cookie, `Accept-Language`); sem `lang`, a rota serve o idioma negociado.
- [pwa](pwa.md): `sw.js` nunca guarda essas páginas como o fallback de `/`.
- [conta](conta.md): Login e Perfil linkam as páginas; `/excluir-conta` explica a exclusão feita no Perfil.
- [moderacao](moderacao.md): os termos listam conteúdo proibido, denúncia e banimento.
