import { createEffect } from "solid-js";
import u from "../utilities.module.css";

/**
 * Helpers for screen readers and keyboard users. Kept free of Supabase and i18n,
 * like the components, so stories and tests can use them.
 */

let region: HTMLElement | undefined;
let pending: ReturnType<typeof setTimeout> | undefined;

/**
 * Says `message` through the screen reader without moving focus, for changes
 * that happen out of sight: an item saved, marked as bought, removed.
 */
export function announce(message: string) {
  if (!region) {
    region = document.createElement("div");
    region.className = u.visuallyHidden;
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  const live = region;
  // Emptied first and filled a moment later, so the same message twice is still read.
  live.textContent = "";
  clearTimeout(pending);
  pending = setTimeout(() => (live.textContent = message), 100);
}

/**
 * Moves focus to `target` once the current update has rendered, for when the
 * button someone pressed disappears and focus would otherwise drop to the page.
 * Takes a function, so a ref that is only set by that render still counts.
 */
export function focusSoon(target: () => HTMLElement | null | undefined) {
  queueMicrotask(() => target()?.focus());
}

/**
 * Focuses the page's heading, so a screen reader starts reading the new page
 * after a link in the app is followed, like it would on a full page load.
 */
export function focusHeading() {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;
  // Headings aren't focusable by default; -1 allows it from code only, not with Tab.
  heading.tabIndex = -1;
  heading.focus();
}

/** The browser tab's (and screen reader's) page title, following the page's heading. */
export function usePageTitle(title: () => string | undefined) {
  createEffect(() => {
    let page: string | undefined;
    try {
      page = title();
    } catch {
      // A failed resource throws when read; the page shows its own error, the tab its name.
    }
    document.title = page ? `${page} · Wishlister` : "Wishlister";
  });
}
