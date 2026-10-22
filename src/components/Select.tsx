import { splitProps, type JSX } from "solid-js";

/** A native select with a chevron that follows the control color and keeps its distance from the border. */
export function Select(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [local, rest] = splitProps(props, ["children"]);
  return (
    <span class="select">
      <select {...rest}>{local.children}</select>
    </span>
  );
}
