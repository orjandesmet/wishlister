import { createSignal } from "solid-js";

/** Chromium's install prompt event. Not in TypeScript's DOM types because it's non-standard. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const dismissedKey = "install-banner-dismissed";

const [installEvent, setInstallEvent] = createSignal<BeforeInstallPromptEvent>();
const [dismissed, setDismissed] = createSignal(readDismissed());

// Listen as soon as the app loads: Chromium fires this once, possibly before any page renders.
window.addEventListener("beforeinstallprompt", (event) => {
  // Keeps Chromium's own mini-infobar away, so only our banner asks.
  event.preventDefault();
  setInstallEvent(event as BeforeInstallPromptEvent);
});
window.addEventListener("appinstalled", () => dismiss());

function readDismissed() {
  try {
    return localStorage.getItem(dismissedKey) === "1";
  } catch {
    return false;
  }
}

/** Hides the banner on this device for good. */
export function dismiss() {
  setDismissed(true);
  setInstallEvent(undefined);
  try {
    localStorage.setItem(dismissedKey, "1");
  } catch {
    // Private mode can block storage; the banner then only stays hidden until a reload.
  }
}

/** Opens the browser's install dialog. Either answer hides the banner. */
export async function install() {
  const event = installEvent();
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  dismiss();
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  // iPadOS reports itself as a Mac, so tell it apart by its touch screen.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

const isMobile = () => window.matchMedia("(pointer: coarse)").matches;

/**
 * What the "Add to home screen" banner shows: Chromium's install button, the share-menu
 * steps on iOS (it has no install prompt), or nothing on desktop, once installed or dismissed.
 */
export function installOffer(): "prompt" | "ios" | undefined {
  if (dismissed() || !isMobile() || isStandalone()) return undefined;
  if (installEvent()) return "prompt";
  if (isIos()) return "ios";
  return undefined;
}
