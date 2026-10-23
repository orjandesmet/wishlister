import { NewGroupForm } from "../components/NewGroupForm.tsx";
import { useCreateGroupAndOpen } from "../lib/createGroupAndOpen.ts";
import { t } from "../lib/i18n.ts";
import { usePageTitle } from "../lib/a11y.ts";

/** Phones: "+" on the groups page opens this. Wide screens use a popover there instead. */
export default function NewGroup() {
  const onCreate = useCreateGroupAndOpen();
  usePageTitle(() => t("home.newGroup"));

  return (
    <>
      <h1>{t("home.newGroup")}</h1>
      <NewGroupForm card onCreate={onCreate} />
    </>
  );
}
