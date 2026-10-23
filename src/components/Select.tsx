import { createEffect, splitProps, type JSX } from "solid-js";
import styles from "./Select.module.css";

/**
 * A native select with a chevron that follows the control color and keeps its distance from the border.
 * `class` goes on the wrapper that draws the chevron, not on the select itself.
 */
export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ["children", "value", "class"]);
  // This is the correct way to get a reference to the select element in SolidJS
  // oxlint-disable-next-line no-unassigned-vars
  let select!: HTMLSelectElement;
  // Set after the options exist: a `value` applied while spreading lands before
  // the options are in the select, which then falls back to its first option.
  createEffect(() => {
    const value = local.value;
    if (value !== undefined) select.value = String(value);
  });
  return (
    <span class={local.class ? `${styles.select} ${local.class}` : styles.select}>
      <select ref={select} {...rest}>
        {local.children}
      </select>
    </span>
  );
}
