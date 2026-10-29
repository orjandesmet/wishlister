/**
 * Runs `apply` (which reorders the cards in `root`), then slides each card that moved from
 * where it was to where it is now (FLIP). Cards are found by `data-item-id`. Without
 * animations, or with reduced motion, the cards just jump. Focus stays on the card it was on,
 * even if moving it in the page dropped it.
 */
export function animateMoves(root: HTMLElement | undefined, apply: () => void) {
  const cards = () => [...(root?.querySelectorAll<HTMLElement>("[data-item-id]") ?? [])];
  const focused = document.activeElement as HTMLElement | null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const before = new Map(
    reduced ? [] : cards().map((card) => [card.dataset.itemId, card.getBoundingClientRect().top]),
  );
  apply();
  if (focused && focused !== document.activeElement && focused.isConnected) {
    focused.focus({ preventScroll: true });
  }
  if (reduced || typeof Element.prototype.animate !== "function") return;
  for (const card of cards()) {
    const was = before.get(card.dataset.itemId);
    if (was === undefined) continue;
    const shift = was - card.getBoundingClientRect().top;
    if (Math.abs(shift) < 1) continue;
    card.animate([{ transform: `translateY(${shift}px)` }, { transform: "none" }], {
      duration: 350,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
  }
}
