import { createResource, createSignal } from "solid-js";
import { announce } from "./a11y.ts";
import { getNudgeState, NUDGE_BELOW_ITEMS, nudgeSecretSanta } from "./api/secretSanta.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import { t } from "./i18n.ts";
import type { ProfileId } from "./ids.ts";
import { loaded } from "./resource.ts";

/**
 * Nudging the person you drew in a Secret Santa for ideas, when their list has few items you
 * could buy. `drawn` says whether you drew the person whose list this is; `name` is theirs.
 */
export function createSecretSantaNudge(
  profileId: () => ProfileId,
  drawn: () => boolean,
  name: () => string,
  runner: ActionRunner,
) {
  const [state, { refetch }] = createResource(
    () => (drawn() ? profileId() : undefined),
    getNudgeState,
  );
  const [busy, runBusy] = runner.busyRunner();
  const [notice, setNotice] = createSignal<string>();

  return {
    /** The nudge's state while the button should show. An extra: no button if it fails. */
    nudgeable: () => {
      const current = loaded(state);
      return current && current.buyable_items < NUDGE_BELOW_ITEMS ? current : undefined;
    },
    busy,
    /** How the last nudge went. */
    notice,
    nudge: () =>
      runBusy(async () => {
        const who = name();
        const result = await nudgeSecretSanta(profileId());
        const text =
          result === "sent"
            ? t("secretSanta.nudgeSent", { name: who })
            : t("secretSanta.nudgeNotSetUp");
        setNotice(text);
        announce(text);
        await refetch();
      }),
  };
}
