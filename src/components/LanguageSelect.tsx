import { For } from "solid-js";
import { localeNames, locales, t, type Locale } from "../lib/i18n.ts";

export type LanguageSelectProps = {
  value: Locale;
  onChange: (locale: Locale) => void;
};

/** Picks the app's language. Each language is listed in its own words. */
export function LanguageSelect(props: LanguageSelectProps) {
  return (
    <label>
      {t("language.label")}
      <select value={props.value} onChange={(e) => props.onChange(e.currentTarget.value as Locale)}>
        <For each={locales}>
          {(locale) => (
            <option value={locale} lang={locale}>
              {localeNames[locale]}
            </option>
          )}
        </For>
      </select>
    </label>
  );
}
