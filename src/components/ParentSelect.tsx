import { For } from "solid-js";
import type { ProfileId } from "../lib/ids.ts";
import { t } from "../lib/i18n.ts";
import { Select } from "./Select.tsx";

export type ParentOption = { id: ProfileId; name: string };

export type ParentSelectProps = {
  /** Form field name, so the form can read the choice on submit. */
  name?: string;
  options: ParentOption[];
  value: ProfileId;
  onChange: (parent: ProfileId) => void;
};

/** Picks a parent for a child from the adults in a group. */
export function ParentSelect(props: ParentSelectProps) {
  return (
    <Select
      name={props.name}
      aria-label={t("group.parent")}
      onChange={(e) => props.onChange(e.currentTarget.value as ProfileId)}
    >
      <For each={props.options}>
        {(option) => (
          // `selected` on each option, not `value` on the select: when the options are
          // rebuilt (e.g. after a refetch) the browser would otherwise jump to the first one
          // while `value` still says something else.
          <option value={option.id} selected={option.id === props.value}>
            {option.name}
          </option>
        )}
      </For>
    </Select>
  );
}
