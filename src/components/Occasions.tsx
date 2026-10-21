import { createSignal, For, onMount, Show } from "solid-js";
import { announce, focusSoon, named } from "../lib/a11y.ts";
import type { Occasion, OccasionInput } from "../lib/api/occasions.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { formatOccasionDate, splitOccasions, type IsoDate } from "../lib/occasions.ts";

export type OccasionsProps = {
  occasions: Occasion[];
  /** Today, so the list knows which occasions have passed. */
  today: IsoDate;
  /** Managers add, change and remove occasions; everyone else only reads them. */
  canEdit: boolean;
  /** Resolves to true once saved; the form keeps what was typed otherwise. */
  onAdd: (input: OccasionInput) => Promise<boolean>;
  /** Resolves to true once saved; the form stays open otherwise. */
  onUpdate: (id: OccasionId, input: OccasionInput) => Promise<boolean>;
  /** Resolves to true once deleted; false when it wasn't (not confirmed, or it failed). */
  onDelete: (occasion: Occasion) => Promise<boolean>;
};

/** A group's occasions: upcoming ones soonest first, past ones folded away below. */
export function Occasions(props: OccasionsProps) {
  const split = () => splitOccasions(props.occasions, props.today, compareNames);
  const [editing, setEditing] = createSignal<OccasionId>();
  const [name, setName] = createSignal("");
  const [date, setDate] = createSignal("");

  // Editing swaps a row for a form and back, and deleting removes it, so focus is
  // moved by hand: into the form, back to the row's Edit button, or to the heading.
  let section: HTMLElement | undefined;
  let heading: HTMLHeadingElement | undefined;
  const stopEditing = (id: OccasionId) => {
    setEditing(undefined);
    focusSoon(() => section?.querySelector<HTMLElement>(`[data-occasion="${id}"] button`));
  };
  const onDelete = async (occasion: Occasion) => {
    if (!(await props.onDelete(occasion))) return;
    announce(t("a11y.removed", { item: occasion.name }));
    focusSoon(() => heading);
  };

  const onAdd = async (event: SubmitEvent) => {
    event.preventDefault();
    const added = name();
    if (!(await props.onAdd({ name: added, date: date() }))) return;
    announce(t("a11y.added", { items: added }));
    setName("");
    setDate("");
  };

  const row = (occasion: Occasion) => (
    <Show
      when={editing() === occasion.id}
      fallback={
        <li class="list-row occasion" data-occasion={occasion.id}>
          <span class="stack small-gap">
            <span>{occasion.name}</span>
            <span class="muted small">{formatOccasionDate(occasion.date, locale())}</span>
          </span>
          <Show when={props.canEdit}>
            <span class="row">
              <button
                type="button"
                class="link"
                aria-label={named(t("common.edit"), occasion.name)}
                onClick={() => setEditing(occasion.id)}
              >
                {t("common.edit")}
              </button>
              <button
                type="button"
                class="link danger"
                aria-label={named(t("common.delete"), occasion.name)}
                onClick={() => void onDelete(occasion)}
              >
                {t("common.delete")}
              </button>
            </span>
          </Show>
        </li>
      }
    >
      <li class="occasion">
        <OccasionForm
          initial={occasion}
          submitLabel={t("common.save")}
          onSubmit={async (input) => {
            if (await props.onUpdate(occasion.id, input)) stopEditing(occasion.id);
          }}
          onCancel={() => stopEditing(occasion.id)}
        />
      </li>
    </Show>
  );

  return (
    <section ref={(el) => (section = el)} class="card">
      <h2 ref={(el) => (heading = el)} tabIndex={-1}>
        {t("occasions.title")}
      </h2>
      <p class="muted small">{t("occasions.help")}</p>
      <ul class="list">
        <For each={split().upcoming} fallback={<li class="muted">{t("occasions.none")}</li>}>
          {row}
        </For>
      </ul>
      <Show when={split().past.length > 0}>
        <details class="past-occasions">
          <summary class="muted">{t("occasions.past", { count: split().past.length })}</summary>
          <ul class="list">
            <For each={split().past}>{row}</For>
          </ul>
        </details>
      </Show>
      <Show when={props.canEdit}>
        <form onSubmit={onAdd}>
          <h3>{t("occasions.new")}</h3>
          <label>
            {t("occasions.name")}
            <input
              required
              placeholder={t("occasions.namePlaceholder")}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
            />
          </label>
          <label>
            {t("occasions.date")}
            <input
              type="date"
              required
              value={date()}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
          <button type="submit">{t("occasions.add")}</button>
        </form>
      </Show>
    </section>
  );
}

type OccasionFormProps = {
  initial: OccasionInput;
  submitLabel: string;
  onSubmit: (input: OccasionInput) => Promise<void>;
  onCancel: () => void;
};

/** Changes one occasion in place. */
function OccasionForm(props: OccasionFormProps) {
  // Only the starting values: reading props once here, outside JSX, is on purpose.
  const [name, setName] = createSignal(props.initial.name);
  const [date, setDate] = createSignal(props.initial.date);
  // It opens from an Edit button that's gone now, so start in the first field.
  let nameInput: HTMLInputElement | undefined;
  onMount(() => nameInput?.focus());

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void props.onSubmit({ name: name(), date: date() });
  };

  return (
    <form onSubmit={onSubmit}>
      <label>
        {t("occasions.name")}
        <input
          ref={(el) => (nameInput = el)}
          required
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </label>
      <label>
        {t("occasions.date")}
        <input
          type="date"
          required
          value={date()}
          onInput={(e) => setDate(e.currentTarget.value)}
        />
      </label>
      <div class="row">
        <button type="submit">{props.submitLabel}</button>
        <button type="button" class="secondary" onClick={() => props.onCancel()}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
