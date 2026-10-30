import { A } from "@solidjs/router";
import { Show } from "solid-js";
import type { Occasion } from "../../lib/api/occasions.ts";
import { t } from "../../lib/i18n.ts";
import type { GroupId } from "../../lib/ids.ts";
import styles from "./SecretSanta.module.css";
import { SecretSantaIcon } from "./SecretSantaIcon.tsx";

export type SecretSantaLinkProps = {
  group: GroupId;
  /** The occasion of the group's running Secret Santa, if there is one. */
  running?: Occasion;
  /** Managers can start one, when there is none running and an upcoming occasion to start it for. */
  canStart: boolean;
};

/** The one page of a group's Secret Santa: starting it, or seeing it once it runs. */
export const secretSantaPath = (group: GroupId) => `/groups/${group}/secret-santa`;

/**
 * The group's only Secret Santa button: "Start Secret Santa" for managers when none is
 * running, "Secret Santa for <occasion>" when one is. Nothing otherwise.
 */
export function SecretSantaLink(props: SecretSantaLinkProps) {
  return (
    <Show when={props.running || props.canStart}>
      <A class={styles.link} href={secretSantaPath(props.group)}>
        <SecretSantaIcon class={styles.icon} />
        <span>
          {props.running
            ? t("secretSanta.viewFor", { occasion: props.running.name })
            : t("secretSanta.start")}
        </span>
      </A>
    </Show>
  );
}
