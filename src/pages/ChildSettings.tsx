import { A, useNavigate, useParams } from "@solidjs/router";
import { RemoveLabel } from "../components/RemoveLabel.tsx";
import { createResource, createSignal, For, Show } from "solid-js";
import { addParent, deleteChild, removeParent } from "../lib/api/children.ts";
import { getAdultProfiles, getProfileDetails, renameProfile } from "../lib/api/profiles.ts";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import { isReady } from "../lib/resource.ts";
import { Select } from "../components/Select.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Person } from "../components/Person.tsx";

/** A child's parents, and deleting the child's profile. */
export default function ChildSettings() {
  const params = useParams<{ profileId: ProfileId }>();
  const navigate = useNavigate();
  const me = useMe();

  const [child, { refetch: refetchChild }] = createResource(
    () => params.profileId,
    getProfileDetails,
  );
  const [adults] = createResource(getAdultProfiles);
  const [error, setError] = createSignal<string>();
  const [name, setName] = createSignal<string>();
  const [saved, setSaved] = createSignal(false);

  const parentIds = () => child()?.managerIds ?? [];
  const iAmParent = () => parentIds().includes(me().profile.id);
  const nameOf = (id: ProfileId) =>
    adults()?.find((a) => a.id === id)?.display_name ?? t("common.someone");
  const candidates = () => (adults() ?? []).filter((a) => !parentIds().includes(a.id));

  async function run(action: () => Promise<unknown>) {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const onRename = (event: SubmitEvent) => {
    event.preventDefault();
    setSaved(false);
    void run(async () => {
      await renameProfile(params.profileId, name() ?? child()!.display_name);
      await refetchChild();
      me().refetchManaged();
      setSaved(true);
    });
  };

  const onAddParent = (parentId: ProfileId) =>
    run(async () => {
      if (!parentId) return;
      await addParent(params.profileId, parentId);
      await refetchChild();
    });

  const onRemoveParent = (parentId: ProfileId) =>
    run(async () => {
      const name = child()!.display_name;
      if (!confirm(t("group.confirmRemoveParent", { parent: nameOf(parentId), child: name })))
        return;
      await removeParent(params.profileId, parentId);
      await refetchChild();
      me().refetchManaged();
    });

  const onDelete = () =>
    run(async () => {
      if (!confirm(t("child.confirmDelete", { name: child()!.display_name }))) return;
      await deleteChild(params.profileId);
      me().refetchManaged();
      navigate("/", { replace: true });
    });

  return (
    <>
      <A class={u.link} href="/">
        {t("group.back")}
      </A>
      <h1>{child()?.display_name ?? t("child.fallbackTitle")}</h1>
      <Show when={child.error}>
        <p class={u.error}>{t("child.unavailable")}</p>
      </Show>
      <Show when={error()}>
        <p class={u.error}>{error()}</p>
      </Show>
      <Show when={!isReady(child) && !child.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      <Show when={isReady(child) && isReady(adults)}>
        <Show when={iAmParent()}>
          <Card as="form" onSubmit={onRename}>
            <label>
              {t("child.name")}
              <input
                required
                value={name() ?? child()?.display_name ?? ""}
                onInput={(e) => setName(e.currentTarget.value)}
              />
            </label>
            <button type="submit">{t("account.saveName")}</button>
            <Show when={saved()}>
              <p class={u.muted}>{t("account.saved")}</p>
            </Show>
          </Card>
        </Show>
        <Card>
          <h2>{t("child.parents")}</h2>
          <ul class={u.list}>
            <For each={parentIds()}>
              {(parentId) => (
                <li class={u.listRow}>
                  <Person id={parentId} name={nameOf(parentId)}>
                    {nameOf(parentId)}
                    {parentId === me().profile.id ? t("common.you") : ""}
                  </Person>
                  <Show when={iAmParent() && parentIds().length > 1}>
                    <Button variant="link" danger onClick={() => onRemoveParent(parentId)}>
                      <RemoveLabel />
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Show when={iAmParent() && candidates().length > 0}>
            <Select onChange={(e) => onAddParent(e.currentTarget.value as ProfileId)}>
              <option value="">{t("group.addParent")}</option>
              <For each={candidates()}>{(a) => <option value={a.id}>{a.display_name}</option>}</For>
            </Select>
          </Show>
        </Card>
        <Show when={iAmParent()}>
          <Button variant="secondary" danger onClick={onDelete}>
            {t("child.deleteProfile")}
          </Button>
        </Show>
      </Show>
    </>
  );
}
