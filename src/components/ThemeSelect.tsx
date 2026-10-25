import { For, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import { themes, type ThemedOccasion, type ThemeId } from "../lib/theme.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";
import { Select } from "./Select.tsx";

export type ThemeSelectProps = {
  value: ThemeId;
  keepMine: boolean;
  /** The occasion whose theme a group has switched on now, if any. */
  occasion?: ThemedOccasion;
  onChange: (theme: ThemeId) => void;
  onKeepMineChange: (keepMine: boolean) => void;
};

/** Picks your theme, and whether group occasions may switch it for a while. */
export function ThemeSelect(props: ThemeSelectProps) {
  return (
    <>
      <label>
        {t("themes.label")}
        <Select
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value as ThemeId)}
        >
          <For each={themes}>
            {(theme) => (
              <option value={theme} selected={theme === props.value}>
                {t(`themes.${theme}`)}
              </option>
            )}
          </For>
        </Select>
      </label>
      <Check>
        <input
          type="checkbox"
          checked={props.keepMine}
          onChange={(e) => props.onKeepMineChange(e.currentTarget.checked)}
        />
        {t("themes.keepMine")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>
        <Show
          when={!props.keepMine && props.occasion?.theme ? props.occasion : undefined}
          fallback={t("themes.keepMineHint")}
        >
          {(occasion) =>
            t("themes.now", {
              occasion: occasion().name,
              theme: t(`themes.${occasion().theme!}`),
            })
          }
        </Show>
      </span>
    </>
  );
}
