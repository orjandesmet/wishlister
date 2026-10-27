import { A } from "@solidjs/router";
import { createSignal, For, Show } from "solid-js";
import type { Occasion } from "../lib/api/occasions.ts";
import type { SecretSantaCandidate, SecretSantaInput } from "../lib/api/secretSanta.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import u from "../utilities.module.css";
import { Check } from "./Check.tsx";
import styles from "./SecretSantaForm.module.css";

export type SecretSantaFormProps = {
  occasion: Occasion;
  candidates: SecretSantaCandidate[];
  busy: boolean;
  error?: string;
  /** Where Cancel goes: back to the group. */
  cancelHref: string;
  onSubmit: (input: SecretSantaInput) => void;
};

const keyOf = (profile: ProfileId, excluded: ProfileId) => `${profile}|${excluded}`;

/** Picks who takes part in a draw, and who must not draw whom. */
export function SecretSantaForm(props: SecretSantaFormProps) {
  // Everyone takes part until unticked, so candidates that load late take part as well.
  const [unticked, setUnticked] = createSignal(new Set<ProfileId>());
  const [excluded, setExcluded] = createSignal(new Set<string>());

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
    props.onSubmit({ occasionId: props.occasion.id, participants, exclusions });
  };

  return (
    <form onSubmit={onSubmit} class={styles.form}>
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
        <A class={u.link} href={props.cancelHref}>
          {t("common.cancel")}
        </A>
      </div>
    </form>
  );
}
