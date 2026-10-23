import type { JSX } from "solid-js";
import styles from "./EmptyState.module.css";

/** What a page shows when it has nothing yet: a message and its one action, centred. */
export function EmptyState(props: { children: JSX.Element }) {
  return <div class={styles.emptyState}>{props.children}</div>;
}
