/** A little Santa with a question mark in his beard. Decorative: the words say what it is. */
export function SecretSantaIcon(props: { class?: string }) {
  return (
    <svg
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {/* The hat with its pompom, and its fur brim. */}
      <path d="M6.5 8.5C6.5 5 9 2.5 12.5 2.5c2.6 0 4.6 1.3 5.5 3.5" />
      <circle cx="19" cy="7.6" r="1.4" />
      <path d="M5 8.5h13" />
      {/* The beard, with the eyes above it. */}
      <path d="M6.5 8.5C5.2 12.5 5.2 17 7.5 20c1.2 1.3 2.4.6 3.5 1.2h2c1.1-.6 2.3.1 3.5-1.2 2.3-3 2.3-7.5 1-11.5" />
      <path d="M9.8 12.2h.01M14.2 12.2h.01" />
      {/* The question mark. */}
      <path d="M10.9 15a1.2 1.2 0 1 1 1.9.9c-.5.3-.8.6-.8 1.1" />
      <path d="M12 19h.01" />
    </svg>
  );
}
