import { createEffect, on } from "solid-js";

/**
 * "I bought this", Undo and the occasion buttons replace each other once the page has saved,
 * so the pressed button is gone. Focus then moves to whatever replaced it (a `[data-purchase]`
 * element in `container`), or the container itself, instead of dropping to the top of the
 * page. Only when focus was really lost, so it never pulls focus away from somewhere else.
 *
 * `state` is what changes once the purchase is saved. Call the returned `pressed()` from each
 * of those buttons.
 */
export function createPurchaseRefocus(
  container: () => HTMLElement | undefined,
  state: () => unknown,
): () => void {
  let refocus = false;
  createEffect(
    on(
      state,
      () => {
        const lost = !document.activeElement || document.activeElement === document.body;
        const element = container();
        if (!refocus || !lost || !element) return;
        refocus = false;
        (element.querySelector<HTMLElement>("[data-purchase]") ?? element).focus();
      },
      { defer: true },
    ),
  );
  return () => {
    refocus = true;
  };
}
