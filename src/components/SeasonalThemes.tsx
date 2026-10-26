import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ThemeId } from "../lib/theme.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";

export type SeasonalThemesProps = {
  on: boolean;
  /** Today's theme, if today has one, to say what the app is dressed up for. */
  today?: ThemeId;
  onChange: (on: boolean) => void;
};

/** Switches the seasonal themes on or off. */
export function SeasonalThemes(props: SeasonalThemesProps) {
  return (
    <div class={`${u.stack} ${u.smallGap}`}>
      <Check>
        <input
          type="checkbox"
          checked={props.on}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        {t("themes.label")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>
        {t("themes.hint")}
        <Show when={props.on && props.today}>
          {(theme) => <> {t("themes.now", { theme: t(`themes.${theme()}`) })}</>}
        </Show>
      </span>
    </div>
  );
}
