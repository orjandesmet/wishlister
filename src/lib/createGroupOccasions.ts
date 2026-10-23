import { createResource } from "solid-js";
import {
  addOccasion,
  deleteOccasion,
  getOccasions,
  updateOccasion,
  type Occasion,
  type OccasionInput,
} from "./api/occasions.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { GroupId, OccasionId } from "./ids.ts";
import { t } from "./i18n.ts";

/** A group's occasions, and changing them. */
export function createGroupOccasions(groupId: () => GroupId, runner: ActionRunner) {
  const [occasions, { refetch }] = createResource(groupId, getOccasions);

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
    onAdd: (input: OccasionInput) => change(() => addOccasion(groupId(), input)),
    onUpdate: (id: OccasionId, input: OccasionInput) => change(() => updateOccasion(id, input)),
    onDelete: (occasion: Occasion) => {
      if (!confirm(t("occasions.confirmDelete", { name: occasion.name }))) return;
      void change(() => deleteOccasion(occasion.id));
    },
  };
}
