import type { JSX } from "solid-js";

/**
 * A Lucide icon (ISC licence): 24 × 24, drawn in the text colour. Only the shapes differ from
 * one icon to the next, so they're the children. Hidden from screen readers: the text beside
 * it, or a visually hidden label, says what it means.
 */
export function Icon(props: {
  children: JSX.Element;
  class?: string;
  classList?: Record<string, boolean | undefined>;
  /** Lucide's own 2 by default; 1.75 is a little lighter, for icons beside text. */
  strokeWidth?: number;
  /** Filled in, not only outlined. */
  filled?: boolean;
}) {
  return (
    <svg
      class={props.class}
      classList={props.classList}
      viewBox="0 0 24 24"
      fill={props.filled ? "currentColor" : "none"}
      stroke="currentColor"
      stroke-width={props.strokeWidth ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}
