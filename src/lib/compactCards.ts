import { createSignal } from "solid-js";

const key = "compact-cards";

function read() {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

// The account's choice is on the profile (profiles.compact_cards); this device keeps a copy so
// lists follow it before the profile has loaded.
const [compactCards, setSignal] = createSignal(read());

/** Whether item cards show compact on every list. Off unless you switched it on. */
export { compactCards };

/** Follows the profile's choice, and keeps a copy on this device. */
export function setCompactCards(on: boolean) {
  setSignal(on);
  try {
    localStorage.setItem(key, String(on));
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

/** Switches right away, saves it on the account, and switches back if saving fails. */
export async function chooseCompactCards(on: boolean, save: (on: boolean) => Promise<void>) {
  const before = compactCards();
  setCompactCards(on);
  try {
    await save(on);
  } catch (e) {
    setCompactCards(before);
    throw e;
  }
}
