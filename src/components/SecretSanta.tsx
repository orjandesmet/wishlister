import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSanta as Draw, SecretSantaCandidate } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { SecretSantaId } from "../lib/ids.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import styles from "./SecretSanta.module.css";

export type SecretSantaProps = {
  /** The group's draws, as the signed-in person sees them: only their own pair. */
  draws: Draw[];
  /** Managers start draws and remove people from them; everyone else only sees their own pair. */
  isManager: boolean;
  /** Managers only: who takes part in each draw. Never who drew whom. */
  participants: Map<SecretSantaId, SecretSantaCandidate[]>;
  onRemove: (draw: Draw, person: SecretSantaCandidate) => void;
};

/** Where a manager starts the Secret Santa of an occasion: a page of its own. */
export const secretSantaPath = (occasion: Occasion) =>
  `/groups/${occasion.group_id}/occasions/${occasion.id}/secret-santa`;

/**
 * The Secret Santa of one upcoming occasion, shown under it in the occasions list: managers
 * get a link to start it (the form is a page of its own) and remove people from a running one;
 * members see whether they take part and who they drew. Nothing at all for a member when the
 * occasion has no draw.
 */
export function OccasionSecretSanta(props: SecretSantaProps & { occasion: Occasion }) {
  const draw = () => props.draws.find((d) => d.occasion_id === props.occasion.id);
  return (
    <Show
      when={draw()}
      fallback={
        <Show when={props.isManager}>
          <div>
            <A class={u.link} href={secretSantaPath(props.occasion)}>
              {t("secretSanta.start")}
              <span class={u.visuallyHidden}> {props.occasion.name}</span>
            </A>
          </div>
        </Show>
      }
    >
      {(d) => <Running draw={d()} {...props} />}
    </Show>
  );
}

/** A draw that has been made: your own pair, and for managers who takes part. */
function Running(props: SecretSantaProps & { occasion: Occasion; draw: Draw }) {
  const people = () => props.participants.get(props.draw.id) ?? [];
  return (
    <div class={u.stack}>
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
      <Show when={props.isManager && people().length > 0}>
        <details class={styles.participants}>
          <summary>{t("secretSanta.participants", { count: people().length })}</summary>
          <p class={`${u.muted} ${u.small}`}>{t("secretSanta.participantsHelp")}</p>
          <ul class={u.list}>
            <For each={people()}>
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
        </details>
      </Show>
    </div>
  );
}
