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
      <span class={u.labelText}>{t("cardView.toggle")}</span>
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
            // Full cards: two tall blocks.
            <>
              <rect width="18" height="7.5" x="3" y="3" rx="2" />
              <rect width="18" height="7.5" x="3" y="13.5" rx="2" />
            </>
          }
        >
          {/* Compact cards: three short blocks. */}
          <rect width="18" height="4.5" x="3" y="3" rx="1.5" />
          <rect width="18" height="4.5" x="3" y="9.75" rx="1.5" />
          <rect width="18" height="4.5" x="3" y="16.5" rx="1.5" />
        </Show>
      </svg>
    </Button>
  );
}
