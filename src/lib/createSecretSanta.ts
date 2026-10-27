import { createResource } from "solid-js";
import {
  getSecretSantaParticipants,
  removeFromSecretSanta,
  type SecretSanta,
  type SecretSantaCandidate,
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
 * takes part and removing people. Never who drew whom, except your own. (Starting one is
 * createSecretSantaStart's, on its own page.)
 */
export function createSecretSanta(
  groupId: () => GroupId,
  data: GroupData,
  occasions: () => Occasion[] | undefined,
  runner: ActionRunner,
) {
  const me = useMe();
  const [draws, { refetch: refetchDraws }] = createCachedResource(groupId, loadSecretSantas);

  // Only managers remove people, so only they load who takes part.
  const [participants, { refetch: refetchParticipants }] = createResource(
    () => (data.isManager() ? draws()?.map((draw) => draw.id) : undefined),
    async (ids) =>
      new Map<SecretSantaId, SecretSantaCandidate[]>(
        await Promise.all(
          ids.map(async (id) => [id, await getSecretSantaParticipants(id)] as const),
        ),
      ),
  );
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
    participants,
    drawsTakingPart,
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
