import { createUniqueId, type JSX } from "solid-js";
import styles from "./Toggle.module.css";

export type ToggleProps = {
  /** The setting's name, shown to the left of the switch. */
  label: JSX.Element;
  on: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  /** Id of an element with a hint, read out after the label. */
  describedBy?: string;
  class?: string;
};

/**
 * An on/off switch for a setting, with its label on the left and the switch on the right. A
 * switch-role checkbox, so it is keyboard and screen-reader friendly; the whole row is tappable.
 */
export function Toggle(props: ToggleProps) {
  const id = createUniqueId();
  return (
    <label
      for={id}
      class={props.class ? `${styles.toggle} ${props.class}` : styles.toggle}
      classList={{ [styles.disabled]: props.disabled }}
    >
      <span class={styles.label}>{props.label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        class={styles.input}
        checked={props.on}
        disabled={props.disabled}
        aria-describedby={props.describedBy}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span class={styles.track} aria-hidden="true">
        <span class={styles.thumb} />
      </span>
    </label>
  );
}
