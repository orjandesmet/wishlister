import { createUniqueId, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ThemeId } from "../lib/theme.ts";
import u from "../utilities.module.css";
import { Toggle } from "./Toggle.tsx";

export type SeasonalThemesProps = {
  on: boolean;
  /** Today's theme, if today has one, to say what the app is dressed up for. */
  today?: ThemeId;
  onChange: (on: boolean) => void;
};

/** Switches the seasonal themes on or off. */
export function SeasonalThemes(props: SeasonalThemesProps) {
  const hintId = createUniqueId();
  return (
    <div class={`${u.stack} ${u.smallGap}`}>
      <Toggle
        label={t("themes.label")}
        on={props.on}
        onChange={props.onChange}
        describedBy={hintId}
      />
      <span id={hintId} class={`${u.muted} ${u.small}`}>
        {t("themes.hint")}
        <Show when={props.on && props.today}>
          {(theme) => <> {t("themes.now", { theme: t(`themes.${theme()}`) })}</>}
        </Show>
      </span>
    </div>
  );
}
