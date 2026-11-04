import { For, Match, Switch } from "solid-js";
import { t } from "../lib/i18n.ts";
import { listViews, type ListView } from "../lib/listView.ts";
import u from "../utilities.module.css";
import styles from "./ListViewSwitch.module.css";

export type ListViewSwitchProps = {
  value: ListView;
  onChange: (view: ListView) => void;
};

/** The view's icon, in the same stroke and corner radius as the Compact button's. */
function ViewIcon(props: { view: ListView }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <Switch>
        <Match when={props.view === "full"}>
          {/* Full cards: two tall blocks. */}
          <rect width="18" height="7.5" x="3" y="3" rx="2" />
          <rect width="18" height="7.5" x="3" y="13.5" rx="2" />
        </Match>
        <Match when={props.view === "compact"}>
          {/* Compact cards: three short blocks. */}
          <rect width="18" height="4.5" x="3" y="3" rx="1.5" />
          <rect width="18" height="4.5" x="3" y="9.75" rx="1.5" />
          <rect width="18" height="4.5" x="3" y="16.5" rx="1.5" />
        </Match>
        <Match when={props.view === "table"}>
          {/* Table: one block with rows. */}
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
        </Match>
      </Switch>
    </svg>
  );
}

/**
 * Full cards, compact cards or a table, beside the list's Select button on wide screens.
 * Replaces the Compact button there. A group of toggle buttons, one pressed.
 */
export function ListViewSwitch(props: ListViewSwitchProps) {
  return (
    <div class={styles.switch} role="group" aria-label={t("listView.label")}>
      <For each={listViews}>
        {(view) => (
          <button
            type="button"
            class={styles.option}
            aria-pressed={props.value === view}
            title={t(`listView.${view}`)}
            onClick={() => props.onChange(view)}
          >
            <ViewIcon view={view} />
            <span class={u.visuallyHidden}>{t(`listView.${view}`)}</span>
          </button>
        )}
      </For>
    </div>
  );
}
