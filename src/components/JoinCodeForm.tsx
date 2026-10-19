import { createSignal, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import { parseJoinCode } from "../lib/joinCode.ts";

export type JoinCodeFormProps = {
  /** Called with the code taken out of what was typed or pasted. */
  onJoin: (code: string) => void;
};

/** Join a group by typing its invite code, or pasting the whole invite link. */
export function JoinCodeForm(props: JoinCodeFormProps) {
  const [input, setInput] = createSignal("");
  const [invalid, setInvalid] = createSignal(false);

  function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const code = parseJoinCode(input());
    setInvalid(code === null);
    if (code) props.onJoin(code);
  }

  return (
    <form class="card" onSubmit={onSubmit}>
      <label>
        {t("joinCode.label")}
        <input
          required
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          placeholder={t("joinCode.placeholder")}
          value={input()}
          onInput={(e) => {
            setInput(e.currentTarget.value);
            setInvalid(false);
          }}
        />
      </label>
      <button type="submit">{t("joinCode.submit")}</button>
      <Show when={invalid()}>
        <p class="error">{t("joinCode.invalid")}</p>
      </Show>
    </form>
  );
}
