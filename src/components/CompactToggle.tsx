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
              <rect width="18" height="8" x="3" y="2.5" rx="2" />
              <rect width="18" height="8" x="3" y="13.5" rx="2" />
              <path d="M7 6.5h10" />
              <path d="M7 17.5h10" />
            </>
          }
        >
          {/* Compact cards: three short blocks. */}
          <rect width="18" height="5" x="3" y="2" rx="1.5" />
          <rect width="18" height="5" x="3" y="9.5" rx="1.5" />
          <rect width="18" height="5" x="3" y="17" rx="1.5" />
          <path d="M7 4.5h10" />
          <path d="M7 12h10" />
          <path d="M7 19.5h10" />
        </Show>
      </svg>
    </Button>
  );
}
