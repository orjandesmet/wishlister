import { createSignal, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Card } from "./Card.tsx";
import styles from "./NewGroupForm.module.css";

export type NewGroupFormProps = {
  /** Creates the group; a rejection is shown under the button. */
  onCreate: (name: string) => Promise<void>;
  /** A card when it stands on its own on a page, bare inside a popover. */
  card?: boolean;
  /** Wide screens: the field and the button on one line. */
  inline?: boolean;
};

/** A name and a button: creates a group and opens it. */
export function NewGroupForm(props: NewGroupFormProps) {
  const [name, setName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await props.onCreate(name());
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  const fields = (
    <>
      <label>
        {t("home.newGroup")}
        <input
          required
          placeholder={t("home.newGroupPlaceholder")}
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </label>
      <button type="submit" disabled={busy()}>
        {t("home.create")}
      </button>
      <Show when={error()}>
        <p class={u.error} role="alert">
          {error()}
        </p>
      </Show>
    </>
  );

  return (
    <Show when={props.card} fallback={<form onSubmit={onSubmit}>{fields}</form>}>
      <Card as="form" class={props.inline ? styles.inline : undefined} onSubmit={onSubmit}>
        {fields}
      </Card>
    </Show>
  );
}
