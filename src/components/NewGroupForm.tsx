import { createSignal, Show } from "solid-js";
import { t } from "../lib/i18n.ts";

export type NewGroupFormProps = {
  /** Creates the group; a rejection is shown under the button. */
  onCreate: (name: string) => Promise<void>;
  /** Extra classes for the form, such as "card" when it stands on its own. */
  class?: string;
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

  return (
    <form class={props.class} onSubmit={onSubmit}>
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
        <p class="error" role="alert">
          {error()}
        </p>
      </Show>
    </form>
  );
}
