import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";

export type CompactCardsSettingProps = {
  on: boolean;
  onChange: (on: boolean) => void;
};

/** Switches compact item cards on or off, for every list. */
export function CompactCardsSetting(props: CompactCardsSettingProps) {
  return (
    <div class={`${u.stack} ${u.smallGap}`}>
      <Check>
        <input
          type="checkbox"
          checked={props.on}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        {t("compactCards.label")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>{t("compactCards.hint")}</span>
    </div>
  );
}
