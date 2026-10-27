import { createUniqueId, type JSX } from "solid-js";

/** The question mark in the 24x24 box: where it sits, and how big it is. */
const QUESTION = { x: 12, y: 15, scale: 1.2 };

/** The gap cut around the question mark wherever it overlaps the Santa, in the Santa's units. */
const HALO = 3.8;

/**
 * A two-tone Santa: the hat in the text colour, the pompom, fur brim, beard and moustache in a
 * lighter tone of it, and a question mark in the text colour. Where the question mark overlaps
 * him (the brim, the moustache, the beard), a gap is cut around it so it reads on any
 * background. Decorative: the words next to it say what it is.
 */
export function SecretSantaIcon(props: { class?: string; style?: JSX.CSSProperties }) {
  // Shapes are shared between the drawing and its masks; the ids are per icon, as the page
  // can hold many.
  const id = createUniqueId();
  const stache = `stache-${id}`;
  const question = `question-${id}`;
  const cutBeard = `cut-beard-${id}`;
  const cutQuestion = `cut-question-${id}`;
  const placed = `translate(${QUESTION.x} ${QUESTION.y}) scale(${QUESTION.scale})`;

  return (
    <svg
      class={props.class}
      style={props.style}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <defs>
        <path
          id={stache}
          d="M12 12.6c-1.2-.9-2.6-1.2-3.9-.8-1.2.4-2-.2-2.4-1 0 1.6.9 2.7 2.3 2.9 1.5.2 2.9-.3 4-1.1zM12 12.6c1.2-.9 2.6-1.2 3.9-.8 1.2.4 2-.2 2.4-1 0 1.6-.9 2.7-2.3 2.9-1.5.2-2.9-.3-4-1.1z"
        />
        {/* Around its own centre, so it can be put anywhere and any size. */}
        <path id={question} d="M-2.3 -2.4a2.3 2.3 0 1 1 3.6 1.9c-.9.6-1.3 1.2-1.3 2.2M0 4.2h.01" />
        {/* The gap around the question mark, cut from whatever it overlaps: the brim, the moustache... */}
        <mask id={cutQuestion} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <rect x="-4" y="-4" width="32" height="32" fill="white" />
          <use
            href={`#${question}`}
            transform={placed}
            fill="none"
            stroke="black"
            stroke-width={HALO / QUESTION.scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
        {/* ...and the beard, which also gets a gap around the moustache. */}
        <mask id={cutBeard} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <rect x="-4" y="-4" width="32" height="32" fill="white" />
          <use href={`#${stache}`} fill="black" stroke="black" stroke-width="1.6" />
          <use
            href={`#${question}`}
            transform={placed}
            fill="none"
            stroke="black"
            stroke-width={HALO / QUESTION.scale}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </mask>
      </defs>
      <g>
        <g mask={`url(#${cutBeard})`}>
          {/* The hat, bent over to the pompom, as wide as the brim is. */}
          <path d="M5.8 7C6 3.2 8.6.6 12 .6c1.9 0 3.6.8 5 2.2l.7.8-1.8.8c-.4 1.1-.3 2.2.3 2.6z" />
          <circle cx="19.2" cy="3.9" r="1.6" opacity=".5" />
          {/* The beard. */}
          <path
            opacity=".5"
            d="M4.8 11c-.3 5.4 2.6 11.2 7.2 12.4 4.6-1.2 7.5-7 7.2-12.4-1.5 1-3.2 1-4.6.4-.9-.4-1.7-.7-2.6-.7s-1.7.3-2.6.7c-1.4.6-3.1.6-4.6-.4z"
          />
        </g>
        {/* The fur brim, and the moustache in the gap cut for it, in the same light tone. */}
        <rect
          x="4.4"
          y="7"
          width="15.2"
          height="2.9"
          rx="1.45"
          opacity=".5"
          mask={`url(#${cutQuestion})`}
        />
        <use href={`#${stache}`} opacity=".5" mask={`url(#${cutQuestion})`} />
      </g>
      {/* The question mark, above it all. */}
      <use
        href={`#${question}`}
        transform={placed}
        fill="none"
        stroke="currentColor"
        stroke-width={1.9 / QUESTION.scale}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
