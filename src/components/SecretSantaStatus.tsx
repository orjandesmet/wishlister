import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { SecretSanta as Draw, SecretSantaCandidate } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";

export type SecretSantaStatusProps = {
  /** The draw, as the signed-in person sees it: only their own pair. */
  draw: Draw;
  /** Managers see who takes part and can remove people. */
  isManager: boolean;
  /** Managers only: who takes part. Never who drew whom. */
  participants: SecretSantaCandidate[];
  onRemove: (draw: Draw, person: SecretSantaCandidate) => void;
};

/**
 * A draw that has been made: whether you take part and who you drew, and for managers who
 * takes part, with the option to remove people.
 */
export function SecretSantaStatus(props: SecretSantaStatusProps) {
  return (
    <Card>
      <p>{t("secretSanta.running")}</p>
      <p>
        <Show
          when={props.draw.taking_part && props.draw.recipient_profile_id}
          fallback={t("secretSanta.notTakingPart")}
        >
          {(id) =>
            t("secretSanta.youDrew", {
              name: <A href={`/lists/${id()}`}>{props.draw.recipient_name}</A>,
            })
          }
        </Show>
      </p>
      <Show when={props.isManager && props.participants.length > 0}>
        <h2>{t("secretSanta.participants", { count: props.participants.length })}</h2>
        <p class={`${u.muted} ${u.small}`}>{t("secretSanta.participantsHelp")}</p>
        <ul class={u.list}>
          <For each={props.participants}>
            {(person) => (
              <li class={u.listRow}>
                <span>{person.display_name}</span>
                <Button variant="link" danger onClick={() => props.onRemove(props.draw, person)}>
                  <RemoveLabel label={t("common.remove")} of={person.display_name} />
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </Card>
  );
}
