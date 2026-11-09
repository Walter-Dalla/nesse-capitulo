/** A parte de i18n que toca o navegador. Nenhum teste importa este módulo: o que dá para testar fica puro em i18n.ts. */
import { useSyncExternalStore } from "react";
import { getLocale, HTML_LANG, localeCookie, resolveInitialLocale, setLocale, subscribe, t, urlWithoutLang, type Locale } from "./i18n.js";

export function initialLocale(): Locale {
  return resolveInitialLocale({
    cookie: document.cookie,
    dataLocale: document.documentElement.dataset.locale,
    languages: navigator.languages,
  });
}

/** Aplica sem gravar: quem nunca escolheu continua acompanhando o idioma do aparelho. */
export function applyLocale(locale: Locale) {
  setLocale(locale);
  document.documentElement.lang = HTML_LANG[locale];
  document.title = t("base.title");
}

/** Escolha explícita: só o seletor chama. */
export function changeLocale(locale: Locale) {
  applyLocale(locale);
  try {
    document.cookie = localeCookie(locale, location.protocol === "https:");
  } catch {
    // cookie bloqueado: o idioma vale até recarregar
  }
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale);
}

export function dropLangParam() {
  if (new URLSearchParams(location.search).has("lang")) history.replaceState(history.state, "", urlWithoutLang(location.href));
}
