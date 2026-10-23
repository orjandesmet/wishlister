import { hueFor } from "../lib/hues.ts";
import u from "../utilities.module.css";
import styles from "./Avatar.module.css";

export type AvatarProps = {
  /** Picks the hue; use something stable like the profile id. */
  id: string;
  name: string;
  size?: "md" | "lg";
};

/**
 * A person's initial on a pale tile in their own hue. Decorative: the name is always beside it.
 * `data-avatar` lets a list row tilt it on hover (utilities.module.css).
 */
export function Avatar(props: AvatarProps) {
  return (
    <span
      class={`${styles.avatar} ${u.tinted}`}
      classList={{ [styles.lg]: props.size === "lg" }}
      style={{ "--h": hueFor(props.id) }}
      data-avatar
      aria-hidden="true"
    >
      {props.name.trim().charAt(0).toLocaleUpperCase() || "?"}
    </span>
  );
}
