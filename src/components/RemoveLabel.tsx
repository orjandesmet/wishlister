import { Icon } from "./Icon.tsx";
import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";

/**
 * "Remove" (or another label for the same action) as text, or a trash can on small screens (the text stays available to screen readers).
 * `of` names what it removes for screen readers only ("Remove Lego castle"), where the same button repeats on every row.
 */
export function RemoveLabel(props: { label?: string; of?: string }) {
  return (
    <>
      <span class={u.labelText}>{props.label ?? t("common.remove")}</span>
      <Show when={props.of}>
        <span class={u.visuallyHidden}> {props.of}</span>
      </Show>
      {/* Lucide "trash-2" (ISC licence). */}
      <Icon class={u.labelIcon} strokeWidth={1.75}>
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </Icon>
    </>
  );
}
