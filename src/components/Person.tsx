import { A } from "@solidjs/router";
import { Show, type JSX } from "solid-js";
import { Avatar } from "./Avatar.tsx";
import styles from "./Person.module.css";

export type PersonProps = {
  /** Picks the avatar's hue: the profile id. */
  id: string;
  /** Whose initial the avatar shows. */
  name: string;
  /** What is written beside the avatar; the name when left out. */
  children?: JSX.Element;
  /** Makes the whole person a link. */
  href?: string;
  class?: string;
  "aria-current"?: "page";
  onClick?: (event: MouseEvent & { currentTarget: HTMLAnchorElement }) => void;
};

/** A person's avatar with their name beside it, optionally a link to somewhere. */
export function Person(props: PersonProps) {
  const classes = () => (props.class ? `${styles.person} ${props.class}` : styles.person);
  const content = () => (
    <>
      <Avatar id={props.id} name={props.name} />
      {props.children ?? props.name}
    </>
  );
  return (
    <Show when={props.href} fallback={<span class={classes()}>{content()}</span>}>
      {(href) => (
        <A
          class={classes()}
          href={href()}
          aria-current={props["aria-current"]}
          onClick={(e) => props.onClick?.(e)}
        >
          {content()}
        </A>
      )}
    </Show>
  );
}
