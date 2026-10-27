import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import type {
  SecretSanta as Draw,
  SecretSantaCandidate,
  SecretSantaInput,
} from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId, SecretSantaId } from "../lib/ids.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Check } from "./Check.tsx";
import { RemoveLabel } from "./RemoveLabel.tsx";
import styles from "./SecretSanta.module.css";

export type SecretSantaProps = {
  /** The group's draws, as the signed-in person sees them: only their own pair. */
  draws: Draw[];
  /** Managers start draws and remove people from them; everyone else only sees their own pair. */
  isManager: boolean;
  /** Managers only: the members who can take part (an account and their own list). */
  candidates: SecretSantaCandidate[];
  /** Managers only: who takes part in each draw. Never who drew whom. */
  participants: Map<SecretSantaId, SecretSantaCandidate[]>;
  /** True while a draw is being made. */
  busy: boolean;
  /** Why the last draw couldn't start, shown by the form's button. */
  error?: string;
  /** Forget `error`, when the form is closed. */
  onClearError?: () => void;
  /** Resolves to true once the draw is made; the form keeps what was set otherwise. */
  onStart: (input: SecretSantaInput) => Promise<boolean>;
  onRemove: (draw: Draw, person: SecretSantaCandidate) => void;
};

/**
 * The Secret Santa of one upcoming occasion, shown under it in the occasions list: managers
 * start it (a link button opens the form) and remove people from it; members see whether they
 * take part and who they drew. Nothing at all for a member when the occasion has no draw.
 */
export function OccasionSecretSanta(props: SecretSantaProps & { occasion: Occasion }) {
  const draw = () => props.draws.find((d) => d.occasion_id === props.occasion.id);
  const [starting, setStarting] = createSignal(false);

  // Starting swaps the link button for a form and back, so focus is moved by hand: the form
  // focuses its heading, and closing it goes back to the button.
  // oxlint-disable-next-line no-unassigned-vars
  let box: HTMLDivElement | undefined;
  const stopStarting = () => {
    setStarting(false);
    props.onClearError?.();
    focusSoon(() => box?.querySelector<HTMLElement>("button"));
  };

  return (
    <Show
      when={draw()}
      fallback={
        <Show when={props.isManager}>
          <div ref={box}>
            <Show
              when={starting()}
              fallback={
                <Button variant="link" onClick={() => setStarting(true)}>
                  {t("secretSanta.start")}
                  <span class={u.visuallyHidden}> {props.occasion.name}</span>
                </Button>
              }
            >
              <StartForm
                occasion={props.occasion}
                candidates={props.candidates}
                busy={props.busy}
                error={props.error}
                onSubmit={async (input) => {
                  if (await props.onStart(input)) setStarting(false);
                }}
                onCancel={stopStarting}
              />
            </Show>
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

type StartFormProps = {
  occasion: Occasion;
  candidates: SecretSantaCandidate[];
  busy: boolean;
  error?: string;
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
      <p class={`${u.muted} ${u.small}`}>{t("secretSanta.help")}</p>
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
      {/* Always there, so screen readers notice when a message appears in it. */}
      <div role="alert" id={`start-error-${props.occasion.id}`}>
        <Show when={props.error}>
          <p class={u.error}>{props.error}</p>
        </Show>
      </div>
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
