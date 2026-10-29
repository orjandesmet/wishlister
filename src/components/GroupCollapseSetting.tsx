import type { GroupCollapseMode } from "../lib/groupCollapse.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";

export type GroupCollapseSettingProps = {
  mode: GroupCollapseMode;
  onChange: (mode: GroupCollapseMode) => void;
};

/** Whether group cards always start collapsed, or the way you left each one. */
export function GroupCollapseSetting(props: GroupCollapseSettingProps) {
  return (
    <fieldset>
      <legend>{t("groupCollapse.label")}</legend>
      <Check>
        <input
          type="radio"
          name="group-collapse-mode"
          checked={props.mode === "always"}
          onChange={() => props.onChange("always")}
        />
        {t("groupCollapse.always")}
      </Check>
      <Check>
        <input
          type="radio"
          name="group-collapse-mode"
          checked={props.mode === "remember"}
          onChange={() => props.onChange("remember")}
        />
        {t("groupCollapse.remember")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>{t("groupCollapse.hint")}</span>
    </fieldset>
  );
}
