---
aliases: [idioma, i18n, tradução, língua, locale, português, inglês, espanhol, seletor de idioma, cookie lang, hreflang, Accept-Language]
---
# Idioma (PT, EN, ES)

Toda a interface existe em português (pt-BR), inglês e espanhol neutro. Quem nunca escolheu vê o idioma do aparelho, depois o do país, e por fim inglês. A escolha no seletor vale por aparelho, em cookie. Dados de livro, resenhas e comentários não traduzem; "Estante" fica como marca nos três idiomas.

## Fluxo
1. Em cada HTML, `negotiateLocale` (`server/locale.ts`) decide: `?lang=` válido; cookie `lang`; `Accept-Language` por `q`; `CF-IPCountry` (`COUNTRY_LOCALE`); `en`.
2. `mountClient` (`server/html.ts`) entrega a home renderizada nesse idioma, ou a SPA com `<html lang data-locale>`.
3. A SPA parte de `initialLocale` (`client/src/lib/localeBrowser.ts`): cookie `lang`, `data-locale`, `navigator.languages`, `en`. `key={locale}` em `client/src/App.tsx` remonta as telas na troca, sem recarregar.
4. O seletor é `LanguageSwitch` em Login e Perfil; na home, sem JS, são links `/?lang=`.

## Invariantes
- Só a escolha explícita grava o cookie: `?lang=` válido no servidor ou `changeLocale` no seletor. Quem nunca escolheu segue o aparelho.
- O país só decide quando o navegador não indica PT, EN nem ES. Sem `CF-IPCountry` (fora da Cloudflare) o passo é pulado.
- HTML sai com `Cache-Control: no-cache` e `Vary: Accept-Language, CF-IPCountry, Cookie`.
- A SPA tira `lang` da URL no boot (`dropLangParam`); o `?lang=` já virou cookie e, se ficasse, desfaria uma troca ao recarregar.
- Chave faltando em algum idioma reprova o `typecheck`: `t` e `tp` (`client/src/lib/i18n.ts`) só aceitam chaves dos dicionários em `client/src/lib/messages/`.
- Plural é `n === 1`, não `Intl.PluralRules`: em pt-BR ele trataria 0 como singular e daria "0 livro".
- Nunca chamar `t` no escopo de módulo: congelaria o idioma. Tabelas como `STATUS_LABEL` são getters por isso.
- Erro da API: a resposta traz `code` (`ERROR_CODES`) e o cliente traduz em `apiErrorMessage`, nunca mostrando o texto PT de `error`. 401 vira sessão expirada; sem `code` conhecido, texto genérico.
- Texto visível em tela passa por `t`: `tests/i18n-literals.ts` varre telas e componentes.

## Interações
- [seo](seo.md): robôs sem cabeçalho veem `/` em EN; PT e ES ficam em `/?lang=`, com `hreflang` e no sitemap.
- [conta](conta.md): seletor no Perfil e no Login; o idioma escolhido na home segue depois de entrar.
- [pwa](pwa.md): o fallback offline do service worker é a última página guardada, no idioma dela; o manifest é só em EN.
