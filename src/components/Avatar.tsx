import { hueFor } from "../lib/hues.ts";

export type AvatarProps = {
  /** Picks the hue; use something stable like the profile id. */
  id: string;
  name: string;
  size?: "md" | "lg";
};

/** A person's initial on a pale tile in their own hue. Decorative: the name is always beside it. */
export function Avatar(props: AvatarProps) {
  return (
    <span
      class="avatar tinted"
      classList={{ lg: props.size === "lg" }}
      style={{ "--h": hueFor(props.id) }}
      aria-hidden="true"
    >
      {props.name.trim().charAt(0).toLocaleUpperCase() || "?"}
    </span>
  );
}
