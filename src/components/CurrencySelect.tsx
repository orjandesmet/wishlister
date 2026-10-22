import { For } from "solid-js";
import { currencies } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import { Select } from "./Select.tsx";

export type CurrencySelectProps = {
  value: string;
  onChange: (currency: string) => void;
};

/** Picks the currency prices are converted to, each listed by code and name. */
export function CurrencySelect(props: CurrencySelectProps) {
  const name = (code: string) =>
    new Intl.DisplayNames(locale(), { type: "currency" }).of(code) ?? code;
  return (
    <label>
      {t("currency.label")}
      <Select value={props.value} onChange={(e) => props.onChange(e.currentTarget.value)}>
        <For each={currencies}>
          {(code) => (
            <option value={code} selected={code === props.value}>
              {code} · {name(code)}
            </option>
          )}
        </For>
      </Select>
      <span class="muted small">{t("currency.hint")}</span>
    </label>
  );
}
