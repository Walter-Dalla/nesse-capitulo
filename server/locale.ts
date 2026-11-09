/** Negociação de idioma da entrega de HTML. Puro: sem `node:*` nem `env`, porque `vite.config.ts` chega aqui via `landingText.ts`. */
export type Locale = "pt" | "en" | "es";

export const LOCALES: readonly Locale[] = ["pt", "en", "es"];
export const LOCALE_COOKIE = "lang";
/** Valor do atributo `lang` do `<html>` em cada idioma. */
export const HTML_LANG: Record<Locale, string> = { pt: "pt-BR", en: "en", es: "es" };

const MAX_HEADER_LENGTH = 1024;
const MAX_HEADER_ITEMS = 32;

const countries = (locale: Locale, codes: string): [string, Locale][] => codes.split(" ").map((code) => [code, locale]);

/** Só decide quando o navegador não indica PT, EN nem ES. `XX` e `T1` da Cloudflare não casam, de propósito. */
export const COUNTRY_LOCALE: Readonly<Record<string, Locale>> = Object.fromEntries([
  ...countries("pt", "BR PT AO MZ CV GW ST TL"),
  ...countries("es", "ES MX AR CO CL PE VE EC GT CU BO DO HN PY SV NI CR PA UY PR GQ"),
]);

/** Aceita `PT`, `pt-BR`, `es-419`; o que não for um dos três idiomas vira null. */
export function normalizeLocale(value: string | undefined): Locale | null {
  const base = value?.trim().toLowerCase().split("-")[0];
  return LOCALES.find((locale) => locale === base) ?? null;
}

/** `q` fora de 0 a 1 ou ilegível conta como 1; `q=0` recusa a língua. */
function parseQuality(params: string[]): number {
  for (const param of params) {
    const match = /^\s*q\s*=\s*(.*?)\s*$/i.exec(param);
    if (!match) continue;
    const q = Number(match[1]);
    return match[1] !== "" && q >= 0 && q <= 1 ? q : 1;
  }
  return 1;
}

/** Idiomas suportados do cabeçalho `Accept-Language`, do mais para o menos preferido. Entrada não confiável: nunca lança. */
export function parseAcceptLanguage(header: string | undefined): Locale[] {
  if (!header) return [];
  const items = header.slice(0, MAX_HEADER_LENGTH).split(",").slice(0, MAX_HEADER_ITEMS);
  const accepted: { locale: Locale; q: number }[] = [];
  for (const item of items) {
    const [tag, ...params] = item.split(";");
    const locale = normalizeLocale(tag);
    const q = parseQuality(params);
    if (locale && q > 0) accepted.push({ locale, q });
  }
  return accepted.sort((a, b) => b.q - a.q).map((entry) => entry.locale);
}

/** Ordem: `query` válida; `cookie` válido; `Accept-Language` por `q`; país; `en`. */
export function negotiateLocale(input: {
  query?: string;
  cookie?: string;
  acceptLanguage?: string;
  country?: string;
}): { locale: Locale; fromQuery: boolean } {
  const query = normalizeLocale(input.query);
  if (query) return { locale: query, fromQuery: true };
  const locale =
    normalizeLocale(input.cookie) ??
    parseAcceptLanguage(input.acceptLanguage)[0] ??
    COUNTRY_LOCALE[input.country?.trim().toUpperCase() ?? ""] ??
    "en";
  return { locale, fromQuery: false };
}
