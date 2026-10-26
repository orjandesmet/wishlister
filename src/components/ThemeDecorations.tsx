import { For, Match, Show, Switch, type JSX } from "solid-js";
import type { ThemeId } from "../lib/theme.ts";
import styles from "./ThemeDecorations.module.css";

/** How many pieces of garland across the top: enough for a wide screen, the rest is cut off. */
const PIECES = 40;
const pieces = Array.from({ length: PIECES }, (_, i) => i);

/** One piece of a garland: a 40×32 drawing, repeated side by side so the string runs on. */
function Piece(props: { index: number; children: JSX.Element }) {
  return (
    <svg
      class={styles.piece}
      style={{ "--i": props.index }}
      viewBox="0 0 40 32"
      width="40"
      height="32"
    >
      {props.children}
    </svg>
  );
}

/**
 * The string the lights and flags hang on: sagging between two hooks. A component, not a
 * shared JSX node: Solid's JSX is a real DOM node, which can only be in one piece at a time.
 */
const Cord = () => <path class={styles.string} d="M0 4 Q20 14 40 4" />;

const bulbColours = ["#e5383b", "#2a9d5c", "#f2b705", "#3a86ff"];
const flagColours = ["#ff6b9a", "#ffd23f", "#3ec1d3", "#9b5de5", "#61d095"];
const eggColours = ["#ffc8dd", "#bde0fe", "#caffbf", "#fdffb6", "#e4c1f9"];

function Garland(props: { theme: ThemeId }) {
  return (
    <div class={styles.garland}>
      <div class={styles.row}>
        <For each={pieces}>
          {(i) => (
            <Piece index={i}>
              <Switch>
                <Match when={props.theme === "sinterklaas"}>
                  <Show
                    when={i % 2 === 0}
                    fallback={
                      <g class={styles.pepernoot}>
                        <circle cx="14" cy="14" r="3.2" fill="#a0612b" />
                        <circle cx="25" cy="20" r="2.8" fill="#8a4f1f" />
                        <circle cx="21" cy="9" r="2.4" fill="#b8763b" />
                      </g>
                    }
                  >
                    <g class={styles.mitre}>
                      <path d="M12 28 L12 14 Q20 2 28 14 L28 28 Z" fill="#c8102e" />
                      <path d="M12 26 L28 26" stroke="#f2c14e" stroke-width="2.5" />
                      <path d="M20 9 L20 22 M15.5 15 L24.5 15" stroke="#f2c14e" stroke-width="2" />
                    </g>
                  </Show>
                </Match>
                <Match when={props.theme === "christmas"}>
                  <Cord />
                  <g class={styles.bulb}>
                    <rect x="17.5" y="8" width="5" height="4" rx="1" fill="#5b5f63" />
                    <ellipse cx="20" cy="17" rx="4.5" ry="6.5" fill={bulbColours[i % 4]} />
                  </g>
                </Match>
                <Match when={props.theme === "birthday"}>
                  <Cord />
                  <path class={styles.flag} d="M6 6 L34 6 L20 28 Z" fill={flagColours[i % 5]} />
                </Match>
                <Match when={props.theme === "newYear"}>
                  <rect
                    class={styles.confetti}
                    x={6 + ((i * 7) % 24)}
                    y={4 + ((i * 5) % 14)}
                    width="5"
                    height="3"
                    rx="1"
                    fill={flagColours[i % 5]}
                    transform={`rotate(${(i * 37) % 180} 20 16)`}
                  />
                  <path
                    class={styles.sparkle}
                    d="M30 6 L31.5 10.5 L36 12 L31.5 13.5 L30 18 L28.5 13.5 L24 12 L28.5 10.5 Z"
                    fill="#f2c14e"
                  />
                </Match>
                <Match when={props.theme === "halloween"}>
                  <g transform={`translate(0 ${(i % 3) * 4})`}>
                    <g class={styles.bat}>
                      <path
                        d="M20 10 C17 6 12 6 8 9 C11 10 12 12 12 14 C14 12 16 12 17 13 L20 15 L23 13 C24 12 26 12 28 14 C28 12 29 10 32 9 C28 6 23 6 20 10 Z"
                        fill="#1b1d1f"
                        stroke="#f28c28"
                        stroke-width="0.6"
                      />
                    </g>
                  </g>
                </Match>
                <Match when={props.theme === "easter"}>
                  <g class={styles.egg}>
                    <ellipse cx="20" cy="17" rx="7" ry="9" fill={eggColours[i % 5]} />
                    <path
                      d="M13.5 15 Q16.75 12.5 20 15 T26.5 15"
                      fill="none"
                      stroke="#fff"
                      stroke-width="1.6"
                    />
                    <path
                      d="M13.4 20 Q16.7 22.5 20 20 T26.6 20"
                      fill="none"
                      stroke="#ffffffaa"
                      stroke-width="1.4"
                    />
                  </g>
                </Match>
              </Switch>
            </Piece>
          )}
        </For>
      </div>
    </div>
  );
}

/**
 * The extras a theme adds along the top of the page: mitres and pepernoten, Christmas lights, confetti,
 * birthday bunting, bats and a spider, Easter eggs. Pure decoration, so hidden from
 * screen readers and never in the way of a tap. It only moves when the system
 * allows motion (see ThemeDecorations.module.css).
 */
export function ThemeDecorations(props: { theme: ThemeId | undefined }) {
  return (
    <Switch>
      <Match when={props.theme}>
        {(theme) => (
          <div class={styles.decorations} aria-hidden="true" data-theme-decorations={theme()}>
            <Garland theme={theme()} />
            {theme() === "halloween" && (
              <svg class={styles.spider} viewBox="0 40 24 80" width="24" height="80">
                <line x1="12" y1="40" x2="12" y2="100" stroke="#9a9ea4" stroke-width="0.8" />
                <g stroke="#e8e9eb" stroke-width="1.2" fill="none">
                  <path d="M8 102 L2 98 M8 105 L1 105 M8 108 L2 113 M16 102 L22 98 M16 105 L23 105 M16 108 L22 113" />
                </g>
                <ellipse cx="12" cy="106" rx="5" ry="6" fill="#1b1d1f" stroke="#e8e9eb" />
                <circle cx="10" cy="104" r="1" fill="#f28c28" />
                <circle cx="14" cy="104" r="1" fill="#f28c28" />
              </svg>
            )}
          </div>
        )}
      </Match>
    </Switch>
  );
}
