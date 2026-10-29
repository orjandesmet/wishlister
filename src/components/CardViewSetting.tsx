import type { CardView } from "../lib/cardView.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";

export type CardViewSettingProps = {
  view: CardView;
  onChange: (view: CardView) => void;
};

/** How item cards show on every list: full, or compact. */
export function CardViewSetting(props: CardViewSettingProps) {
  return (
    <fieldset>
      <legend>{t("cardView.label")}</legend>
      <Check>
        <input
          type="radio"
          name="card-view"
          checked={props.view === "full"}
          onChange={() => props.onChange("full")}
        />
        {t("cardView.full")}
      </Check>
      <Check>
        <input
          type="radio"
          name="card-view"
          checked={props.view === "compact"}
          onChange={() => props.onChange("compact")}
        />
        {t("cardView.compact")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>{t("cardView.hint")}</span>
    </fieldset>
  );
}
