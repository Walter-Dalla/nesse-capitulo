import { LOCALES, t, type Locale } from "../lib/i18n.js";
import { changeLocale, useLocale } from "../lib/localeBrowser.js";

/** `key={locale}` remonta a árvore na troca: o foco volta ao botão escolhido. */
let refocus: Locale | null = null;

export function LanguageSwitch() {
  const locale = useLocale();
  return (
    <div className="flex gap-2" role="group" aria-label={t("base.language.label")}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          ref={(el) => {
            if (el && refocus === option) {
              refocus = null;
              el.focus();
            }
          }}
          onClick={() => {
            if (option !== locale) refocus = option;
            changeLocale(option);
          }}
          className={locale === option ? "chip-on" : "chip-off"}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
