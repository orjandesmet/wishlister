import { A } from "@solidjs/router";
import { createSignal, createUniqueId, For, Show } from "solid-js";
import type { Occasion } from "../../lib/api/occasions.ts";
import type {
  MinLoopSize,
  SecretSantaCandidate,
  SecretSantaInput,
} from "../../lib/api/secretSanta.ts";
import { locale, t } from "../../lib/i18n.ts";
import type { OccasionId, ProfileId } from "../../lib/ids.ts";
import { effectiveLoopSize, loopSizeOptions } from "../../lib/loopSize.ts";
import { formatOccasionDate } from "../../lib/occasions.ts";
import u from "../../utilities.module.css";
import { Check } from "../Check.tsx";
import { MarkdownField } from "../MarkdownField.tsx";
import { Select } from "../Select.tsx";
import styles from "./SecretSantaForm.module.css";

export type SecretSantaFormProps = {
  /** The upcoming occasions to choose from, soonest first. The first is chosen to start with. */
  occasions: Occasion[];
  candidates: SecretSantaCandidate[];
  busy: boolean;
  error?: string;
  /** Where Cancel goes: back to the group. */
  cancelHref: string;
  onSubmit: (input: SecretSantaInput) => void;
};

/** Longest message the database accepts. */
const MAX_MESSAGE = 2000;

const keyOf = (profile: ProfileId, excluded: ProfileId) => `${profile}|${excluded}`;

/** Picks who takes part in a draw, and who must not draw whom. */
export function SecretSantaForm(props: SecretSantaFormProps) {
  // Everyone takes part until unticked, so candidates that load late take part as well.
  const [unticked, setUnticked] = createSignal(new Set<ProfileId>());
  const [excluded, setExcluded] = createSignal(new Set<string>());

  const id = createUniqueId();
  const [chosen, setChosen] = createSignal<OccasionId>();
  const occasionId = () => chosen() ?? props.occasions[0]?.id;

  const [message, setMessage] = createSignal("");

  const [pickedLoop, setPickedLoop] = createSignal<MinLoopSize>("all");

  const taking = () => props.candidates.filter((c) => !unticked().has(c.profile_id));
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(value);
    else next.delete(value);
    return next;
  };

  const loopSizes = () => loopSizeOptions(taking().length);
  const loopSize = () => effectiveLoopSize(pickedLoop(), taking().length);

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const occasion = occasionId();
    if (!occasion || taking().length < 2) return;
    const participants = taking().map((c) => c.profile_id);
    // Exclusions of someone who was unticked after setting them don't count.
    const exclusions = participants.flatMap((profile) =>
      participants
        .filter((other) => excluded().has(keyOf(profile, other)))
        .map((other) => ({ profile, excluded: other })),
    );
    props.onSubmit({
      occasionId: occasion,
      participants,
      exclusions,
      minLoopSize: loopSize(),
      message: message().trim() || undefined,
    });
  };

  return (
    <form onSubmit={onSubmit} class={styles.form}>
      <p class={`${u.muted} ${u.small}`}>{t("secretSanta.help")}</p>
      <label>
        {t("secretSanta.occasion")}
        <Select
          required
          value={occasionId() ?? ""}
          onChange={(e) => setChosen(e.currentTarget.value as OccasionId)}
        >
          <For each={props.occasions}>
            {(occasion) => (
              <option value={occasion.id}>
                {occasion.name} · {formatOccasionDate(occasion.date, locale())}
              </option>
            )}
          </For>
        </Select>
      </label>
      <Show
        when={props.candidates.length > 0}
        fallback={<p class={u.muted}>{t("secretSanta.nobodyToDraw")}</p>}
      >
        <fieldset aria-describedby={`who-help-${id}`}>
          <legend>{t("secretSanta.who")}</legend>
          <p id={`who-help-${id}`} class={`${u.muted} ${u.small}`}>
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
          <fieldset aria-describedby={`exclusions-help-${id}`}>
            <legend>{t("secretSanta.exclusions")}</legend>
            <p id={`exclusions-help-${id}`} class={`${u.muted} ${u.small}`}>
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

      <Show when={taking().length >= 2}>
        <label>
          {t("secretSanta.minLoop")}
          <Select
            aria-describedby={`loop-help-${id}`}
            value={String(loopSize())}
            disabled={loopSizes().length === 0}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setPickedLoop(value === "all" ? "all" : Number(value));
            }}
          >
            <For each={loopSizes()}>{(size) => <option value={size}>{size}</option>}</For>
            <option value="all">{t("secretSanta.loopAll")}</option>
          </Select>
        </label>
        <p id={`loop-help-${id}`} class={`${u.muted} ${u.small}`}>
          {t("secretSanta.minLoopHelp")}
        </p>
      </Show>

      <MarkdownField
        label={t("secretSanta.message")}
        rows={4}
        maxLength={MAX_MESSAGE}
        describedBy={`message-help-${id}`}
        value={message()}
        onInput={setMessage}
      />
      <p id={`message-help-${id}`} class={`${u.muted} ${u.small}`}>
        {t("secretSanta.messageHelp")}
      </p>

      <Show when={taking().length < 2}>
        <p class={u.muted} id={`need-two-${id}`}>
          {t("secretSanta.needTwo")}
        </p>
      </Show>
      {/* Always there, so screen readers notice when a message appears in it. */}
      <div role="alert" id={`start-error-${id}`}>
        <Show when={props.error}>
          <p class={u.error}>{props.error}</p>
        </Show>
      </div>
      <div class={u.row}>
        <button
          type="submit"
          disabled={props.busy || taking().length < 2}
          aria-describedby={taking().length < 2 ? `need-two-${id}` : undefined}
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
