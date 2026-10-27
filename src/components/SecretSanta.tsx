import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import type {
  SecretSanta as Draw,
  SecretSantaCandidate,
  SecretSantaInput,
} from "../lib/api/secretSanta.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { OccasionId, ProfileId, SecretSantaId } from "../lib/ids.ts";
import { formatOccasionDate, splitOccasions, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Check } from "./Check.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import styles from "./SecretSanta.module.css";

export type SecretSantaProps = {
  occasions: Occasion[];
  /** The group's draws, as the signed-in person sees them: only their own pair. */
  draws: Draw[];
  /** Today, so the card knows which occasions have passed. */
  today: IsoDate;
  /** Managers start draws and remove people from them; everyone else only sees their own pair. */
  isManager: boolean;
  /** Managers only: the members who can take part (an account and their own list). */
  candidates: SecretSantaCandidate[];
  /** Managers only: who takes part in each draw. Never who drew whom. */
  participants: Map<SecretSantaId, SecretSantaCandidate[]>;
  /** True while a draw is being made. */
  busy: boolean;
  /** Resolves to true once the draw is made; the form keeps what was set otherwise. */
  onStart: (input: SecretSantaInput) => Promise<boolean>;
  onRemove: (draw: Draw, person: SecretSantaCandidate) => void;
};

/**
 * A group's Secret Santa draws, one per upcoming occasion. Managers start them and remove
 * people from them; members see whether they take part and who they drew.
 */
export function SecretSanta(props: SecretSantaProps) {
  const upcoming = () => splitOccasions(props.occasions, props.today, compareNames).upcoming;
  const drawOf = (occasion: Occasion) => props.draws.find((d) => d.occasion_id === occasion.id);
  // Managers get every upcoming occasion, to start a draw for; members only those with one.
  const shown = () => upcoming().filter((o) => props.isManager || drawOf(o));
  const [starting, setStarting] = createSignal<OccasionId>();

  // Starting swaps a button for a form and back, so focus is moved by hand: the form focuses
  // its heading, and closing it goes back to that occasion's Start button.
  // oxlint-disable-next-line no-unassigned-vars
  let list: HTMLElement | undefined;
  const stopStarting = (id: OccasionId) => {
    setStarting(undefined);
    focusSoon(() => list?.querySelector<HTMLElement>(`[data-occasion="${id}"] button`));
  };

  const row = (occasion: Occasion) => (
    <li class={`${styles.occasion} ${u.stack}`} data-occasion={occasion.id}>
      <span class={`${u.stack} ${u.smallGap}`}>
        <h3 class={styles.name}>{occasion.name}</h3>
        <span class={`${u.muted} ${u.small}`}>{formatOccasionDate(occasion.date, locale())}</span>
      </span>
      <Show
        when={drawOf(occasion)}
        fallback={
          <Show when={props.isManager}>
            <Show
              when={starting() === occasion.id}
              fallback={
                <div>
                  <Button variant="secondary" onClick={() => setStarting(occasion.id)}>
                    {t("secretSanta.start")}
                    <span class={u.visuallyHidden}> {occasion.name}</span>
                  </Button>
                </div>
              }
            >
              <StartForm
                occasion={occasion}
                candidates={props.candidates}
                busy={props.busy}
                onSubmit={async (input) => {
                  if (await props.onStart(input)) setStarting(undefined);
                }}
                onCancel={() => stopStarting(occasion.id)}
              />
            </Show>
          </Show>
        }
      >
        {(draw) => <Running draw={draw()} {...props} />}
      </Show>
    </li>
  );

  return (
    <Show when={props.isManager || shown().length > 0}>
      <Card ref={list}>
        <h2>{t("secretSanta.title")}</h2>
        <p class={`${u.muted} ${u.small}`}>{t("secretSanta.help")}</p>
        <ul class={u.list}>
          <For each={shown()} fallback={<li class={u.muted}>{t("secretSanta.noOccasions")}</li>}>
            {row}
          </For>
        </ul>
      </Card>
    </Show>
  );
}

/** A draw that has been made: your own pair, and for managers who takes part. */
function Running(props: SecretSantaProps & { draw: Draw }) {
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

type StartFormProps = {
  occasion: Occasion;
  candidates: SecretSantaCandidate[];
  busy: boolean;
  onSubmit: (input: SecretSantaInput) => Promise<void>;
  onCancel: () => void;
};

const keyOf = (profile: ProfileId, excluded: ProfileId) => `${profile}|${excluded}`;

/** Picks who takes part in a draw, and who must not draw whom. */
function StartForm(props: StartFormProps) {
  // Everyone takes part until unticked, so candidates that load late take part as well.
  const [unticked, setUnticked] = createSignal(new Set<ProfileId>());
  const [excluded, setExcluded] = createSignal(new Set<string>());
  // It opens from a Start button that's gone now, so it starts in its heading.
  // oxlint-disable-next-line no-unassigned-vars
  let heading: HTMLHeadingElement | undefined;
  focusSoon(() => heading);

  const taking = () => props.candidates.filter((c) => !unticked().has(c.profile_id));
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(value);
    else next.delete(value);
    return next;
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (taking().length < 2) return;
    const participants = taking().map((c) => c.profile_id);
    // Exclusions of someone who was unticked after setting them don't count.
    const exclusions = participants.flatMap((profile) =>
      participants
        .filter((other) => excluded().has(keyOf(profile, other)))
        .map((other) => ({ profile, excluded: other })),
    );
    void props.onSubmit({ occasionId: props.occasion.id, participants, exclusions });
  };

  return (
    <form onSubmit={onSubmit} class={styles.form} aria-labelledby={`start-${props.occasion.id}`}>
      <h4 id={`start-${props.occasion.id}`} ref={heading} tabIndex={-1}>
        {t("secretSanta.start")}
        <span class={u.visuallyHidden}> {props.occasion.name}</span>
      </h4>
      <Show
        when={props.candidates.length > 0}
        fallback={<p class={u.muted}>{t("secretSanta.nobodyToDraw")}</p>}
      >
        <fieldset aria-describedby={`who-help-${props.occasion.id}`}>
          <legend>{t("secretSanta.who")}</legend>
          <p id={`who-help-${props.occasion.id}`} class={`${u.muted} ${u.small}`}>
            {t("secretSanta.whoHelp")}
          </p>
          <For each={props.candidates}>
            {(candidate) => (
              <Check>
                <input
                  type="checkbox"
                  checked={!unticked().has(candidate.profile_id)}
                  onChange={(e) =>
                    setUnticked(toggle(unticked(), candidate.profile_id, !e.currentTarget.checked))
                  }
                />
                {candidate.display_name}
              </Check>
            )}
          </For>
        </fieldset>

        <Show when={taking().length >= 2}>
          <fieldset aria-describedby={`exclusions-help-${props.occasion.id}`}>
            <legend>{t("secretSanta.exclusions")}</legend>
            <p id={`exclusions-help-${props.occasion.id}`} class={`${u.muted} ${u.small}`}>
              {t("secretSanta.exclusionsHelp")}
            </p>
            <For each={taking()}>
              {(person) => {
                const others = () => taking().filter((c) => c.profile_id !== person.profile_id);
                const count = () =>
                  others().filter((o) => excluded().has(keyOf(person.profile_id, o.profile_id)))
                    .length;
                return (
                  <details class={styles.exclusions}>
                    <summary>
                      {person.display_name}: {t("secretSanta.excludedCount", { count: count() })}
                    </summary>
                    <fieldset>
                      <legend>{t("secretSanta.mustNotDraw", { name: person.display_name })}</legend>
                      <For each={others()}>
                        {(other) => (
                          <Check>
                            <input
                              type="checkbox"
                              checked={excluded().has(keyOf(person.profile_id, other.profile_id))}
                              onChange={(e) =>
                                setExcluded(
                                  toggle(
                                    excluded(),
                                    keyOf(person.profile_id, other.profile_id),
                                    e.currentTarget.checked,
                                  ),
                                )
                              }
                            />
                            {other.display_name}
                          </Check>
                        )}
                      </For>
                    </fieldset>
                  </details>
                );
              }}
            </For>
          </fieldset>
        </Show>
      </Show>

      <Show when={taking().length < 2}>
        <p class={u.muted} id={`need-two-${props.occasion.id}`}>
          {t("secretSanta.needTwo")}
        </p>
      </Show>
      <div class={u.row}>
        <button
          type="submit"
          disabled={props.busy || taking().length < 2}
          aria-describedby={taking().length < 2 ? `need-two-${props.occasion.id}` : undefined}
        >
          {props.busy ? t("secretSanta.drawing") : t("secretSanta.draw")}
        </button>
        <Button variant="secondary" onClick={() => props.onCancel()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
