import u from "../utilities.module.css";

/** An "edit" or "manage" label as text, or a pencil on small screens (the text stays available to screen readers). */
export function EditLabel(props: { label: string; icon?: "pencil" | "chevron" }) {
  return (
    <>
      <span class={u.labelText}>{props.label}</span>
      {/* Lucide "pencil" and "chevron-right" (ISC licence). */}
      <svg
        class={u.labelIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        {props.icon === "chevron" ? (
          <path d="m9 18 6-6-6-6" />
        ) : (
          <>
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            <path d="m15 5 4 4" />
          </>
        )}
      </svg>
    </>
  );
}
