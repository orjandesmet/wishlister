import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";

export type GroupCollapseSettingProps = {
  on: boolean;
  onChange: (on: boolean) => void;
};

/** Whether this device remembers which groups' members you folded away on the groups page. */
export function GroupCollapseSetting(props: GroupCollapseSettingProps) {
  return (
    <div class={`${u.stack} ${u.smallGap}`}>
      <Check>
        <input
          type="checkbox"
          checked={props.on}
          onChange={(e) => props.onChange(e.currentTarget.checked)}
        />
        {t("groupCollapse.label")}
      </Check>
      <span class={`${u.muted} ${u.small}`}>{t("groupCollapse.hint")}</span>
    </div>
  );
}
