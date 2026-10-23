import { splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import styles from "./Card.module.css";

export type CardProps = JSX.HTMLAttributes<HTMLElement> & {
  /** The element the card is; a section unless it is a form, a list item or the page itself. */
  as?: "section" | "form" | "li" | "div" | "main" | "aside";
};

/** A white panel on the page ground, with its contents stacked inside. */
export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ["as", "class"]);
  return (
    <Dynamic
      component={local.as ?? "section"}
      class={local.class ? `${styles.card} ${local.class}` : styles.card}
      {...rest}
    />
  );
}
