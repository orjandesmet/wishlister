import { A, type AnchorProps } from "@solidjs/router";
import { splitProps, type JSX } from "solid-js";
import styles from "./Button.module.css";

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** "primary" is the main action, "secondary" a quieter one, "link" looks like a link. */
  variant?: "primary" | "secondary" | "link";
  /** Removes or deletes something: red. */
  danger?: boolean;
  size?: "small";
};

/** A button in one of the app's looks. Defaults to type="button", so it never submits by accident. */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "danger", "size", "class", "type"]);
  const classes = () =>
    [
      local.variant && local.variant !== "primary" && styles[local.variant],
      local.danger && styles.danger,
      local.size === "small" && styles.small,
      local.class,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return <button type={local.type ?? "button"} class={classes()} {...rest} />;
}

/** A link in the app that looks like the main action. */
export function LinkButton(props: AnchorProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return <A class={[styles.linkButton, local.class].filter(Boolean).join(" ")} {...rest} />;
}
