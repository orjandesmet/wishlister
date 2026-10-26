import {
  addOccasion,
  deleteOccasion,
  updateOccasion,
  type Occasion,
  type OccasionInput,
} from "./api/occasions.ts";
import { announce, focusHeading } from "./a11y.ts";
import { createCachedResource } from "./cache.ts";
import { loadGroupOccasions } from "./loaders.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { GroupId, OccasionId } from "./ids.ts";
import { t } from "./i18n.ts";

/** A group's occasions, and changing them. */
export function createGroupOccasions(groupId: () => GroupId, runner: ActionRunner) {
  const [occasions, { refetch }] = createCachedResource(groupId, loadGroupOccasions);

  /** Runs a change to the occasions and reloads them. True when it worked. */
  async function change(action: () => Promise<unknown>) {
    let saved = false;
    await runner.run(async () => {
      await action();
      saved = true;
      await refetch();
    });
    return saved;
  }

  return {
    occasions,
    onAdd: async (input: OccasionInput) => {
      const saved = await change(() => addOccasion(groupId(), input));
      if (saved) announce(t("a11y.added", { items: input.name }));
      return saved;
    },
    onUpdate: (id: OccasionId, input: OccasionInput) => change(() => updateOccasion(id, input)),
    onDelete: (occasion: Occasion) => {
      if (!confirm(t("occasions.confirmDelete", { name: occasion.name }))) return;
      void change(() => deleteOccasion(occasion.id)).then((deleted) => {
        if (!deleted) return;
        // Its row, and the button just pressed, are gone.
        announce(t("a11y.removed", { item: occasion.name }));
        focusHeading();
      });
    },
  };
}
