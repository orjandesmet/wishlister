import { createSignal } from "solid-js";

/** How item cards show on every list: "full", or "compact" with the full card one tap away. */
export type CardView = "full" | "compact";

const key = "card-view";

function read(): CardView {
  try {
    return localStorage.getItem(key) === "compact" ? "compact" : "full";
  } catch {
    return "full";
  }
}

// The account's choice is on the profile (profiles.card_view); this device keeps a copy so
// lists follow it before the profile has loaded.
const [cardView, setSignal] = createSignal<CardView>(read());

/** How item cards show on every list; "full" unless you picked another view. */
export { cardView };

/** Follows the profile's choice, and keeps a copy on this device. */
export function setCardView(view: CardView) {
  setSignal(view);
  try {
    localStorage.setItem(key, view);
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

/** Switches right away, saves it on the account, and switches back if saving fails. */
export async function chooseCardView(view: CardView, save: (view: CardView) => Promise<void>) {
  const before = cardView();
  setCardView(view);
  try {
    await save(view);
  } catch (e) {
    setCardView(before);
    throw e;
  }
}
