import type { User } from "./types.js";

/** Versão vigente dos termos de uso; subir o número pede um novo aceite. */
export const TERMS_VERSION = 1;

export const TERMS_REQUIRED = { error: "Aceite os termos de uso para continuar", code: "TERMS_REQUIRED" };

export function hasAcceptedTerms(user: Pick<User, "terms_version">) {
  return user.terms_version === TERMS_VERSION;
}
