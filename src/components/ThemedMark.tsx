import { Match, Switch } from "solid-js";
import { activeTheme } from "../lib/theme.ts";
import styles from "./ThemedMark.module.css";

/**
 * The app's mark (the popping present) as shown inside the app, wearing a hat for
 * the seasonal theme. The favicon and the installed app's icons never change.
 */
export function ThemedMark(props: { class?: string }) {
  return (
    <span class={props.class ? `${styles.mark} ${props.class}` : styles.mark}>
      <img src="/favicon.svg" alt="" />
      <Switch>
        <Match when={activeTheme() === "christmas"}>
          <svg class={styles.hat} viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M6 32 C10 18 18 6 30 8 C34 9 36 14 34 18 C30 14 26 16 26 32 Z"
              fill="#d62839"
            />
            <rect x="3" y="29" width="27" height="7" rx="3.5" fill="#fff" />
            <circle cx="34" cy="20" r="4" fill="#fff" />
          </svg>
        </Match>
        <Match when={activeTheme() === "newYear" || activeTheme() === "birthday"}>
          <svg class={styles.hat} viewBox="0 0 40 40" aria-hidden="true">
            <path
              d="M8 34 L20 4 L32 34 Z"
              fill={activeTheme() === "newYear" ? "#1f2a6b" : "#ff6b9a"}
            />
            <path
              d="M12.5 23 L27.5 23 M10.5 28.5 L29.5 28.5 M15 16.5 L25 16.5"
              stroke={activeTheme() === "newYear" ? "#f2c14e" : "#ffd23f"}
              stroke-width="2.5"
            />
            <circle
              cx="20"
              cy="4"
              r="3.5"
              fill={activeTheme() === "newYear" ? "#f2c14e" : "#3ec1d3"}
            />
          </svg>
        </Match>
        <Match when={activeTheme() === "halloween"}>
          <svg class={styles.hat} viewBox="0 0 40 40" aria-hidden="true">
            <ellipse
              cx="20"
              cy="33"
              rx="19"
              ry="4.5"
              fill="#1b1d1f"
              stroke="#f28c28"
              stroke-width="0.8"
            />
            <path
              d="M10 33 L17 6 C18 3 22 2 26 6 L24 8 L30 33 Z"
              fill="#1b1d1f"
              stroke="#f28c28"
              stroke-width="0.8"
            />
            <rect x="11" y="27" width="18.5" height="4" fill="#f28c28" />
          </svg>
        </Match>
        <Match when={activeTheme() === "easter"}>
          <svg class={`${styles.hat} ${styles.ears}`} viewBox="0 0 40 40" aria-hidden="true">
            <ellipse
              cx="13"
              cy="18"
              rx="5.5"
              ry="16"
              fill="#f4f1ec"
              transform="rotate(-12 13 18)"
            />
            <ellipse
              cx="13"
              cy="19"
              rx="2.6"
              ry="11"
              fill="#ffc8dd"
              transform="rotate(-12 13 19)"
            />
            <ellipse cx="27" cy="18" rx="5.5" ry="16" fill="#f4f1ec" transform="rotate(12 27 18)" />
            <ellipse cx="27" cy="19" rx="2.6" ry="11" fill="#ffc8dd" transform="rotate(12 27 19)" />
          </svg>
        </Match>
      </Switch>
    </span>
  );
}
