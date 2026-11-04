import { createSignal } from "solid-js";
import { cardView, type CardView } from "./cardView.ts";

/** How a list shows its items: full or compact cards, or (on wide screens) a table. */
export type ListView = CardView | "table";

export const listViews: ListView[] = ["full", "compact", "table"];

/**
 * Where the table fits: desktops and tablets held sideways, from the width where the tab
 * bar becomes a sidebar (TabBar.module.css). Smaller screens only get cards.
 */
export const tableMedia = "(min-width: 900px)";

const key = "list-view";

function read(): ListView | undefined {
  try {
    const saved = localStorage.getItem(key);
    return listViews.includes(saved as ListView) ? (saved as ListView) : undefined;
  } catch {
    return undefined;
  }
}

const [picked, setPicked] = createSignal<ListView | undefined>(read());

const query = typeof matchMedia === "function" ? matchMedia(tableMedia) : undefined;
const [wide, setWide] = createSignal(query?.matches ?? false);
query?.addEventListener("change", (event) => setWide(event.matches));

/** Whether the screen is wide enough for the table, following rotations and resizes. */
export { wide as tableFits };

/**
 * The view a list shows. On a wide screen, the view picked on this device wins over the
 * account's card view from Settings; nothing picked yet, it follows the account. Smaller
 * screens always follow the account's card view.
 */
export function effectiveListView(
  picked: ListView | undefined,
  account: CardView,
  wide: boolean,
): ListView {
  return wide ? (picked ?? account) : account;
}

/** The view lists show right now (see effectiveListView). */
export function listView(): ListView {
  return effectiveListView(picked(), cardView(), wide());
}

/** Picks the view on this device only, for every list. undefined follows the account again. */
export function chooseListView(view: ListView | undefined) {
  setPicked(view);
  try {
    if (view) localStorage.setItem(key, view);
    else localStorage.removeItem(key);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}
