import { createEffect, splitProps, type JSX } from "solid-js";

/** A native select with a chevron that follows the control color and keeps its distance from the border. */
export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ["children", "value"]);
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
    <span class="select">
      <select ref={select} {...rest}>
        {local.children}
      </select>
    </span>
  );
}
