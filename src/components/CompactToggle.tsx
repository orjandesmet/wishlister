import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import styles from "./CompactToggle.module.css";

export type CompactToggleProps = {
  on: boolean;
  onChange: (on: boolean) => void;
};

/**
 * Switches compact item cards on or off, beside the list's Select and sort menu. A toggle
 * button (aria-pressed); on small screens only its icon shows, the one for the current state.
 */
export function CompactToggle(props: CompactToggleProps) {
  return (
    <Button
      variant="secondary"
      size="small"
      class={styles.toggle}
      classList={{ [styles.on]: props.on }}
      aria-pressed={props.on}
      onClick={() => props.onChange(!props.on)}
    >
      <span class={u.labelText}>{t("compactCards.toggle")}</span>
      <svg
        class={u.labelIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <Show
          when={props.on}
          fallback={
            // Lucide "layout-list" (ISC licence): full cards, a picture beside each.
            <>
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
              <path d="M14 4h7" />
              <path d="M14 9h7" />
              <path d="M14 15h7" />
              <path d="M14 20h7" />
            </>
          }
        >
          {/* Lucide "list" (ISC licence): compact cards, one line each. */}
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
        </Show>
      </svg>
    </Button>
  );
}
