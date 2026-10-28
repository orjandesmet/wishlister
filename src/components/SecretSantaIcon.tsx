import { createUniqueId, Show, type JSX } from "solid-js";

/** The question mark in the 24x24 box: where it sits, and how big it is. */
const QUESTION = { x: 12, y: 15, scale: 1.2 };

/** The gap cut around the question mark wherever it overlaps the Santa, in the Santa's units. */
const HALO = 3.8;

export type SecretSantaIconProps = {
  class?: string;
  style?: JSX.CSSProperties;
  hasQuestionMark?: boolean;
};

/**
 * A two-tone Santa: the hat in the text colour, the pompom, fur brim, beard and moustache in a
 * lighter tone of it, and optionally a question mark in the text colour. Where the question mark overlaps
 * him (the brim, the moustache, the beard), a gap is cut around it so it reads on any
 * background. Decorative: the words next to it say what it is.
 */
export function SecretSantaIcon(props: SecretSantaIconProps) {
  const hasQuestionMark = () => props.hasQuestionMark ?? true;
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
          d="M 12 13.6 C 10.8 12.7 9.4 12.4 8.1 12.8 C 6.9 13.2 6.1 12.6 5.7 11.8 C 5.7 13.4 6.6 14.5 8 14.7 C 9.5 14.9 10.9 14.4 12 13.6 Z M 12 13.6 C 13.2 12.7 14.6 12.4 15.9 12.8 C 17.1 13.2 17.9 12.6 18.3 11.8 C 18.3 13.4 17.4 14.5 16 14.7 C 14.5 14.9 13.1 14.4 12 13.6 Z"
        />
        {/* Around its own centre, so it can be put anywhere and any size. */}
        <path id={question} d="M-2.3 -2.4a2.3 2.3 0 1 1 3.6 1.9c-.9.6-1.3 1.2-1.3 2.2M0 4.2h.01" />
        {/* The gap around the question mark, cut from whatever it overlaps: the brim, the moustache... */}
        <mask id={cutQuestion} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <rect x="-4" y="-4" width="32" height="32" fill="white" />
          <Show when={hasQuestionMark()}>
            <use
              href={`#${question}`}
              transform={placed}
              fill="none"
              stroke="black"
              stroke-width={HALO / QUESTION.scale}
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </Show>
        </mask>
        {/* ...and the beard, which also gets a gap around the moustache. */}
        <mask id={cutBeard} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
          <rect x="-4" y="-4" width="32" height="32" fill="white" />
          <use href={`#${stache}`} fill="black" stroke="black" stroke-width="1.6" />
          <Show when={hasQuestionMark()}>
            <use
              href={`#${question}`}
              transform={placed}
              fill="none"
              stroke="black"
              stroke-width={HALO / QUESTION.scale}
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </Show>
        </mask>
      </defs>
      <g>
        <g mask={`url(#${cutBeard})`}>
          {/* The hat, bent over to the pompom, as wide as the brim is. */}
          <path d="M 5.8 7 C 6 3.2 8.893 0.604 12.98 0.651 C 17.067 0.698 19.428 4.202 19.428 4.202 C 19.428 4.202 16.974 4.926 18.142 7 L 5.8 7 Z" />
          <circle cx="20.82" cy="4.56" r="1.45" opacity=".5" />
          {/* The beard. */}
          <path
            opacity=".5"
            d="M 4.8 13.6 C 4.596 17.278 5.4 19.7 7.7 21.6 C 8.7 22.5 11.7 23.2 12 24 C 12.289 23.244 15.3 22.5 16.3 21.6 C 18.6 19.7 19.404 17.278 19.2 13.6 C 17.7 14.6 12 14.581 12 14.581 C 12 14.581 6.3 14.6 4.8 13.6 Z"
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
      <Show when={hasQuestionMark()}>
        <use
          href={`#${question}`}
          transform={placed}
          fill="none"
          stroke="currentColor"
          stroke-width={1.9 / QUESTION.scale}
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </Show>
    </svg>
  );
}
