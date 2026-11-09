/** Idioma corrente e tradução. Sem DOM nem React: os testes importam daqui; o que toca o navegador fica em localeBrowser.ts. */
import { MESSAGES, type MessageKey } from "./messages/index.js";
import { ERROR_CODES, type ErrorCode } from "./types.js";

export type Locale = "pt" | "en" | "es";
export const LOCALES: readonly Locale[] = ["pt", "en", "es"];
export type { MessageKey };
export type MessageParams = Record<string, string | number>;

/** Chaves com as duas formas, `<base>_one` e `<base>_other`. */
type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}_one` ? (`${Base}_other` extends MessageKey ? Base : never) : never;
}[MessageKey];

const INTL_TAG: Record<Locale, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
/** Valor do atributo `lang` do `<html>`, o mesmo que o servidor entrega. */
export const HTML_LANG: Record<Locale, string> = { pt: "pt-BR", en: "en", es: "es" };

let current: Locale = "en";
const listeners = new Set<() => void>();

export const getLocale = (): Locale => current;

export function setLocale(locale: Locale) {
  if (locale === current) return;
  current = locale;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Troca `{nome}` por `params.nome`, uma passada só: o valor nunca é reinterpretado. Não interpreta HTML. */
export function t(key: MessageKey, params?: MessageParams): string {
  const dictionary: Record<MessageKey, string> = MESSAGES[current];
  const message = dictionary[key];
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (slot, name: string) => (Object.hasOwn(params, name) ? String(params[name]) : slot));
}

/** Plural por `n === 1`, nunca por Intl.PluralRules: em pt-BR ela dá `one` para 0, e "0 livros" viraria "0 livro". */
export function tp(baseKey: PluralKey, n: number, params?: MessageParams): string {
  const key = `${baseKey}${n === 1 ? "_one" : "_other"}` as MessageKey;
  return t(key, { ...params, count: n });
}

export const intlTag = (): string => INTL_TAG[current];

const isErrorCode = (code: unknown): code is ErrorCode => ERROR_CODES.includes(code as ErrorCode);

/** Texto de um erro da API. Nunca o texto PT do servidor: `code` vem de JSON externo, por isso a checagem na lista e não no dicionário. */
export function apiErrorMessage(code: string | undefined, status: number): string {
  if (status === 401) return t("base.error.session");
  if (isErrorCode(code)) return t(`base.error.${code}`);
  return t("base.error.generic");
}

/** Aceita `PT`, `pt-BR`, `es-419`; o que não for um dos três idiomas vira null. */
function normalizeLocale(value: string | undefined): Locale | null {
  const base = value?.trim().toLowerCase().split("-")[0];
  return LOCALES.find((locale) => locale === base) ?? null;
}

/** `cookie` é o texto cru de `document.cookie`. Ordem: cookie `lang`; `data-locale`; `languages` por língua-base; `en`. */
export function resolveInitialLocale(input: { cookie?: string; dataLocale?: string; languages?: readonly string[] }): Locale {
  const fromCookie = /(?:^|;\s*)lang=([^;]*)/.exec(input.cookie ?? "")?.[1];
  const fromLanguages = (input.languages ?? []).map(normalizeLocale).find((locale) => locale !== null);
  return normalizeLocale(fromCookie) ?? normalizeLocale(input.dataLocale) ?? fromLanguages ?? "en";
}

export function localeCookie(locale: Locale, https: boolean): string {
  return `lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${https ? "; Secure" : ""}`;
}

/** `?lang=` já virou cookie no servidor; deixá-lo na URL desfaria uma escolha posterior ao recarregar. */
export function urlWithoutLang(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("lang");
  return `${url.pathname}${url.search}${url.hash}`;
}
