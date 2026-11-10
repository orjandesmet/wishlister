import { createSignal } from "solid-js";

const key = "show-delivery";

function read(): boolean {
  try {
    return localStorage.getItem(key) === "on";
  } catch {
    return false;
  }
}

// The account's choice is on the profile (profiles.show_delivery); this device keeps a copy so
// lists follow it before the profile has loaded.
const [showDelivery, setSignal] = createSignal(read());

/** Whether item cards show the "Delivered" tick on what you bought; off unless you switched it on. */
export { showDelivery };

/** Follows the profile's choice, and keeps a copy on this device. */
export function setShowDelivery(on: boolean) {
  setSignal(on);
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Private mode can block storage; the choice then lasts until a reload.
  }
}

/** Switches right away, saves it on the account, and switches back if saving fails. */
export async function chooseShowDelivery(on: boolean, save: (on: boolean) => Promise<void>) {
  const before = showDelivery();
  setShowDelivery(on);
  try {
    await save(on);
  } catch (e) {
    setShowDelivery(before);
    throw e;
  }
}
