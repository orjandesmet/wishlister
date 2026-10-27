import { A } from "@solidjs/router";
import { Show } from "solid-js";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta as Draw } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { SecretSantaLabel } from "./SecretSantaLabel.tsx";

export type SecretSantaProps = {
  /** The group's draws. */
  draws: Draw[];
  /** Managers can start one for any upcoming occasion; everyone else only sees running ones. */
  isManager: boolean;
};

/** The Secret Santa of an occasion: starting it, or seeing it, happens on a page of its own. */
export const secretSantaPath = (occasion: Occasion) =>
  `/groups/${occasion.group_id}/occasions/${occasion.id}/secret-santa`;

/** Whether an occasion has a Secret Santa link: running for anyone, or startable by a manager. */
export const hasSecretSantaLink = (props: SecretSantaProps, occasion: Occasion) =>
  props.isManager || props.draws.some((d) => d.occasion_id === occasion.id);

/**
 * A link beside an upcoming occasion's Edit and Delete in the occasions list: "Start Secret
 * Santa" for managers when there is none, "Secret Santa" when one is running. On small screens
 * it is a Santa with a question mark. Nothing for a member when the occasion has no draw.
 */
export function OccasionSecretSanta(props: SecretSantaProps & { occasion: Occasion }) {
  const running = () => props.draws.some((d) => d.occasion_id === props.occasion.id);
  return (
    <Show when={hasSecretSantaLink(props, props.occasion)}>
      <A class={u.link} href={secretSantaPath(props.occasion)}>
        <SecretSantaLabel
          label={running() ? t("secretSanta.view") : t("secretSanta.start")}
          of={props.occasion.name}
        />
      </A>
    </Show>
  );
}
