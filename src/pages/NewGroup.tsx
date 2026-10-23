import { NewGroupForm } from "../components/NewGroupForm.tsx";
import { useCreateGroupAndOpen } from "../lib/createGroupAndOpen.ts";
import { t } from "../lib/i18n.ts";

/** Phones: "+" on the groups page opens this. Wide screens use a popover there instead. */
export default function NewGroup() {
  const onCreate = useCreateGroupAndOpen();
  return (
    <>
      <h1>{t("home.newGroup")}</h1>
      <NewGroupForm class="card" onCreate={onCreate} />
    </>
  );
}
