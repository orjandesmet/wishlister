import { t } from "../lib/i18n.ts";

/** "Remove" (or another label for the same action) as text, or a trash can on small screens (the text stays available to screen readers). */
export function RemoveLabel(props: { label?: string }) {
  return (
    <>
      <span class="remove-text">{props.label ?? t("common.remove")}</span>
      {/* Lucide "trash-2" (ISC licence). */}
      <svg
        class="remove-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </>
  );
}
