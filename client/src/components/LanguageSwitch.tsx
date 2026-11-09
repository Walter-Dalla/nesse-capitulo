import { LOCALES, t } from "../lib/i18n.js";
import { changeLocale, useLocale } from "../lib/localeBrowser.js";

export function LanguageSwitch() {
  const locale = useLocale();
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t("base.language.label")}>
      {LOCALES.map((option) => (
        <button key={option} type="button" role="radio" aria-checked={locale === option} onClick={() => changeLocale(option)} className={locale === option ? "chip-on" : "chip-off"}>
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
