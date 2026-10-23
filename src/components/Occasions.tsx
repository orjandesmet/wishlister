import { EditLabel } from "./EditLabel.tsx";
import { createSignal, For, Show } from "solid-js";
import { RemoveLabel } from "./RemoveLabel.tsx";
import type { Occasion, OccasionInput } from "../lib/api/occasions.ts";
import { compareNames, locale, t } from "../lib/i18n.ts";
import type { OccasionId } from "../lib/ids.ts";
import { formatOccasionDate, splitOccasions, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import styles from "./Occasions.module.css";

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
  onDelete: (occasion: Occasion) => void;
};

/** A group's occasions: upcoming ones soonest first, past ones folded away below. */
export function Occasions(props: OccasionsProps) {
  const split = () => splitOccasions(props.occasions, props.today, compareNames);
  const [editing, setEditing] = createSignal<OccasionId>();
  const [name, setName] = createSignal("");
  const [date, setDate] = createSignal("");

  const onAdd = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!(await props.onAdd({ name: name(), date: date() }))) return;
    setName("");
    setDate("");
  };

  const row = (occasion: Occasion) => (
    <Show
      when={editing() === occasion.id}
      fallback={
        <li class={`${u.listRow} ${styles.occasion}`}>
          <span class={`${u.stack} ${u.smallGap} ${styles.dates}`}>
            <span>{occasion.name}</span>
            <span class={`${u.muted} ${u.small}`}>
              {formatOccasionDate(occasion.date, locale())}
            </span>
          </span>
          <Show when={props.canEdit}>
            <span class={u.row}>
              <Button variant="link" onClick={() => setEditing(occasion.id)}>
                <EditLabel label={t("common.edit")} />
              </Button>
              <Button variant="link" danger onClick={() => props.onDelete(occasion)}>
                <RemoveLabel label={t("common.delete")} />
              </Button>
            </span>
          </Show>
        </li>
      }
    >
      <li class={styles.occasion}>
        <OccasionForm
          initial={occasion}
          submitLabel={t("common.save")}
          onSubmit={async (input) => {
            if (await props.onUpdate(occasion.id, input)) setEditing(undefined);
          }}
          onCancel={() => setEditing(undefined)}
        />
      </li>
    </Show>
  );

  return (
    <Card>
      <h2>{t("occasions.title")}</h2>
      <p class={`${u.muted} ${u.small}`}>{t("occasions.help")}</p>
      <ul class={u.list}>
        <For each={split().upcoming} fallback={<li class={u.muted}>{t("occasions.none")}</li>}>
          {row}
        </For>
      </ul>
      <Show when={split().past.length > 0}>
        <details class={styles.past}>
          <summary class={u.muted}>{t("occasions.past", { count: split().past.length })}</summary>
          <ul class={u.list}>
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
    </Card>
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

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    void props.onSubmit({ name: name(), date: date() });
  };

  return (
    <form onSubmit={onSubmit}>
      <label>
        {t("occasions.name")}
        <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
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
      <div class={u.row}>
        <button type="submit">{props.submitLabel}</button>
        <Button variant="secondary" onClick={() => props.onCancel()}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
