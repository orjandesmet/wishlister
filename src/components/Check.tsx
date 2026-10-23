import type { JSX } from "solid-js";
import styles from "./Check.module.css";

/** A label holding a checkbox or radio and its text, side by side. */
export function Check(props: { class?: string; children: JSX.Element }) {
  return (
    <label class={props.class ? `${styles.check} ${props.class}` : styles.check}>
      {props.children}
    </label>
  );
}
