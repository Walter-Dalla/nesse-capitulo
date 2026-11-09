import { CONTACT_EMAIL } from "./contact.js";
import type { User } from "./types.js";

/** Quem modera as denúncias. O e-mail só chega verificado (ver decodeIdToken/verifyIdTokenRemote). */
export const MODERATOR_EMAILS = [CONTACT_EMAIL];

export function isModerator(user: Pick<User, "email">): boolean {
  const email = user.email?.trim().toLowerCase();
  return !!email && MODERATOR_EMAILS.some((m) => m.toLowerCase() === email);
}
