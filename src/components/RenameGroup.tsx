import { createSignal } from "solid-js";
import { renameGroup } from "../lib/api/groups.ts";
import type { ActionRunner } from "../lib/createActionRunner.ts";
import type { GroupData } from "../lib/createGroupData.ts";
import { t } from "../lib/i18n.ts";
import { Button } from "./Button.tsx";
import { Popover } from "./Popover.tsx";
import styles from "./RenameGroup.module.css";

/** A button beside the group's title that opens a small form to rename it. */
export function RenameGroup(props: { data: GroupData; runner: ActionRunner }) {
  const [groupName, setGroupName] = createSignal<string>();

  const onRename = (event: SubmitEvent) => {
    event.preventDefault();
    document.getElementById("rename-popover")?.hidePopover();
    void props.runner.run(async () => {
      await renameGroup(props.data.groupId(), groupName() ?? props.data.group()!.name);
      await props.data.refetchGroup();
      props.runner.setNotice(t("group.renamed"));
    });
  };

  return (
    <>
      <Button variant="secondary" class={styles.renameButton} popovertarget="rename-popover">
        {t("group.rename")}
      </Button>
      <Popover id="rename-popover" anchor="--rename-group" sheet>
        <form onSubmit={onRename}>
          <label>
            {t("group.groupName")}
            <input
              required
              value={groupName() ?? props.data.group()?.name ?? ""}
              onInput={(e) => setGroupName(e.currentTarget.value)}
            />
          </label>
          <button type="submit">{t("group.rename")}</button>
        </form>
      </Popover>
    </>
  );
}
