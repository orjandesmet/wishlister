import { createResource, createSignal } from "solid-js";
import {
  getSecretSantaCandidates,
  getSecretSantaParticipants,
  removeFromSecretSanta,
  startSecretSanta,
  type SecretSanta,
  type SecretSantaCandidate,
  type SecretSantaInput,
} from "./api/secretSanta.ts";
import type { Occasion } from "./api/occasions.ts";
import { announce, focusHeading } from "./a11y.ts";
import { createCachedResource } from "./cache.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { GroupData } from "./createGroupData.ts";
import { t } from "./i18n.ts";
import type { GroupId, ProfileId, SecretSantaId } from "./ids.ts";
import { loadSecretSantas } from "./loaders.ts";
import { useMe } from "./me.tsx";
import { today } from "./occasions.ts";

/**
 * A group's Secret Santa draws as the signed-in person sees them, and, for managers, who
 * can take part, who does, and starting and removing. Never who drew whom, except your own.
 */
export function createSecretSanta(
  groupId: () => GroupId,
  data: GroupData,
  occasions: () => Occasion[] | undefined,
  runner: ActionRunner,
) {
  const me = useMe();
  const [draws, { refetch: refetchDraws }] = createCachedResource(groupId, loadSecretSantas);

  // Only managers start draws and remove people, so only they load these.
  const [candidates] = createResource(
    () => (data.isManager() ? groupId() : undefined),
    getSecretSantaCandidates,
  );
  const [participants, { refetch: refetchParticipants }] = createResource(
    () => (data.isManager() ? draws()?.map((draw) => draw.id) : undefined),
    async (ids) =>
      new Map<SecretSantaId, SecretSantaCandidate[]>(
        await Promise.all(
          ids.map(async (id) => [id, await getSecretSantaParticipants(id)] as const),
        ),
      ),
  );
  const [busy, setBusy] = createSignal(false);
  // Why a draw couldn't start, shown by the form's button instead of at the top of the page.
  const [startError, setStartError] = createSignal<string>();

  const reload = () => Promise.all([refetchDraws(), refetchParticipants()]);
  const occasionName = (draw: SecretSanta) =>
    occasions()?.find((o) => o.id === draw.occasion_id)?.name ?? "";

  /** The names of the running draws a member takes part in, as far as you can see. */
  const drawsTakingPart = (profileId: ProfileId) =>
    (draws() ?? [])
      .filter((draw) => {
        const occasion = occasions()?.find((o) => o.id === draw.occasion_id);
        if (!occasion || occasion.date < today()) return false;
        if (profileId === me().profile.id) return draw.taking_part;
        return (
          participants()
            ?.get(draw.id)
            ?.some((p) => p.profile_id === profileId) ?? false
        );
      })
      .map(occasionName);

  return {
    draws,
    candidates,
    participants,
    busy,
    startError,
    clearStartError: () => setStartError(undefined),
    drawsTakingPart,
    /** Resolves to true once the draw is made; the form keeps what was set otherwise. */
    onStart: async (input: SecretSantaInput) => {
      const occasion = occasions()?.find((o) => o.id === input.occasionId);
      const name = occasion?.name ?? "";
      if (
        !confirm(
          t("secretSanta.confirmStart", { occasion: name, count: input.participants.length }),
        )
      ) {
        return false;
      }
      let started = false;
      setStartError(undefined);
      setBusy(true);
      try {
        const mail = await startSecretSanta(input);
        started = true;
        runner.setError(undefined);
        runner.setNotice(
          t(
            mail === "sent"
              ? "secretSanta.startedSent"
              : mail === "not_set_up"
                ? "secretSanta.startedNotSetUp"
                : "secretSanta.startedMailFailed",
          ),
        );
        announce(t("a11y.secretSantaStarted", { occasion: name }));
      } catch (e) {
        setStartError((e as Error).message);
      }
      setBusy(false);
      // The draw is made either way; a failed refresh is the page's to report.
      if (started) await runner.run(reload);
      return started;
    },
    onRemove: (draw: SecretSanta, person: SecretSantaCandidate) => {
      if (!confirm(t("secretSanta.confirmRemove", { name: person.display_name }))) return;
      void runner.run(async () => {
        const result = await removeFromSecretSanta(draw.id, person.profile_id);
        await reload();
        runner.setNotice(
          t(result === "draw_deleted" ? "secretSanta.drawEnded" : "secretSanta.removed", {
            name: person.display_name,
          }),
        );
        // Their row, and the button just pressed, are gone.
        announce(t("a11y.removed", { item: person.display_name }));
        focusHeading();
      });
    },
  };
}

export type SecretSantaState = ReturnType<typeof createSecretSanta>;
