import { base } from "./base.js";
import { library } from "./library.js";
import { social } from "./social.js";

export const MESSAGES = {
  pt: { ...base.pt, ...library.pt, ...social.pt },
  en: { ...base.en, ...library.en, ...social.en },
  es: { ...base.es, ...library.es, ...social.es },
};

export type MessageKey = keyof typeof MESSAGES.pt;
