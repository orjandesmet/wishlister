import type { JSX } from "solid-js";
import styles from "./Popover.module.css";

export type PopoverProps = {
  /** What popovertarget on the opening button points at. */
  id: string;
  /** The anchor-name (a --dashed name) of the button it opens from. */
  anchor: string;
  /** Where it sits around that button, as a position-area. Below it, right edges level, by default. */
  area?: string;
  /** Its margin while anchored; 8px above it by default, to keep clear of the button. */
  margin?: string;
  /** On small screens it becomes a sheet docked to the bottom edge. */
  sheet?: boolean;
  class?: string;
  ref?: (el: HTMLDivElement) => void;
  children: JSX.Element;
};

/** A panel that floats over the page, opened by a button with popovertarget. */
export function Popover(props: PopoverProps) {
  const classes = () =>
    [styles.popover, props.sheet && styles.sheet, props.class].filter(Boolean).join(" ");
  return (
    <div
      id={props.id}
      ref={(el) => props.ref?.(el)}
      class={classes()}
      style={{
        "--popover-anchor": props.anchor,
        "--popover-area": props.area,
        "--popover-margin": props.margin,
      }}
      popover
    >
      {props.children}
    </div>
  );
}
