/** Idioma corrente e tradução. Sem DOM nem React: os testes importam daqui; o que toca o navegador fica em localeBrowser.ts. */
import { MESSAGES, type MessageKey } from "./messages/index.js";

export type Locale = "pt" | "en" | "es";
export type { MessageKey };
export type MessageParams = Record<string, string | number>;

/** Chaves com as duas formas, `<base>_one` e `<base>_other`. */
type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}_one` ? (`${Base}_other` extends MessageKey ? Base : never) : never;
}[MessageKey];

const INTL_TAG: Record<Locale, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };

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
