import { createResource, createSignal } from "solid-js";
import { announce } from "./a11y.ts";
import {
  getSecretSantaCandidates,
  startSecretSanta,
  type MailState,
  type SecretSantaInput,
} from "./api/secretSanta.ts";
import { clearCache } from "./cache.ts";
import { t } from "./i18n.ts";
import type { GroupId } from "./ids.ts";

/** Starting a group's Secret Santa for an occasion: who can take part, and making the draw. */
export function createSecretSantaStart(
  groupId: () => GroupId,
  occasionName: () => string,
  /** Runs once the draw is made, to load it. */
  onStarted: () => Promise<unknown>,
) {
  // Managers only: the database refuses anyone else.
  const [candidates] = createResource(groupId, getSecretSantaCandidates);
  const [busy, setBusy] = createSignal(false);
  // Why the draw couldn't start, shown by the form's button.
  const [error, setError] = createSignal<string>();
  // How the emails went, once the draw is made.
  const [started, setStarted] = createSignal<MailState>();

  return {
    candidates,
    busy,
    error,
    started,
    /** Asks first; the draw is only made when they agree. */
    onStart: async (input: SecretSantaInput) => {
      const name = occasionName();
      if (
        !confirm(
          t("secretSanta.confirmStart", { occasion: name, count: input.participants.length }),
        )
      ) {
        return;
      }
      setError(undefined);
      setBusy(true);
      try {
        setStarted(await startSecretSanta(input));
        // Made by a Netlify function, not through the Supabase client, so what the group page
        // remembers about its draws is out of date now.
        clearCache();
        await onStarted();
        announce(t("a11y.secretSantaStarted", { occasion: name }));
      } catch (e) {
        setError((e as Error).message);
      }
      setBusy(false);
    },
  };
}
