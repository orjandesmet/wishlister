import { splitProps, type JSX } from "solid-js";
import u from "../utilities.module.css";
import styles from "./Chip.module.css";

/** A small label. With a hue (see lib/hues.ts) it is tinted in that hue, like a category. */
export function Chip(props: { hue?: number; children: JSX.Element }) {
  return (
    <span
      class={props.hue === undefined ? styles.chip : `${styles.chip} ${u.tinted}`}
      style={props.hue === undefined ? undefined : { "--h": props.hue }}
    >
      {props.children}
    </span>
  );
}

/** A row of chip buttons that wraps. */
export function Chips(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={local.class ? `${styles.chips} ${local.class}` : styles.chips} {...rest} />;
}

/** A chip to tap. Give it aria-pressed to make it a toggle. */
export function ChipButton(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <button
      type="button"
      class={local.class ? `${styles.chipButton} ${local.class}` : styles.chipButton}
      {...rest}
    />
  );
}
