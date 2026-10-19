import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, on, Show } from "solid-js";
import { addItem, getCategories, getItem, updateItem } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";

/** Add an item (/lists/:profileId/items/new) or edit one (/items/:itemId/edit). */
export default function ItemForm() {
  const params = useParams<{ profileId?: ProfileId; itemId?: ItemId }>();
  const navigate = useNavigate();

  const [item] = createResource(() => params.itemId, getItem);
  const profileId = () => params.profileId ?? item()?.profile_id;
  const [profile] = createResource(profileId, getProfileDetails);
  const [categories] = createResource(getCategories);

  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [allGroups, setAllGroups] = createSignal(true);
  const [groupIds, setGroupIds] = createSignal<GroupId[]>([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  // When editing, copy the loaded item into the form once.
  createEffect(
    on(item, (loaded) => {
      if (!loaded) return;
      setName(loaded.name);
      setUrl(loaded.url ?? "");
      setCategory(loaded.category ?? "");
      setAllGroups(loaded.visible_in_all_groups);
      setGroupIds(loaded.item_groups.map((g) => g.group_id));
    }),
  );

  const toggleGroup = (id: GroupId, checked: boolean) =>
    setGroupIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!allGroups() && groupIds().length === 0) {
      setError(t("itemForm.pickGroup"));
      return;
    }
    setBusy(true);
    setError(undefined);
    const input = {
      name: name(),
      url: url(),
      category: category(),
      visible_in_all_groups: allGroups(),
      groupIds: groupIds(),
    };
    try {
      if (params.itemId) await updateItem(params.itemId, input);
      else await addItem(profileId()!, input);
      navigate(`/lists/${profileId()}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{params.itemId ? t("itemForm.editTitle") : t("itemForm.addTitle")}</h1>
      <form class="card" onSubmit={onSubmit}>
        <label>
          {t("itemForm.name")}
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <label>
          {t("itemForm.link")}
          <input
            type="url"
            inputmode="url"
            placeholder="https://"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
        </label>
        <label>
          {t("itemForm.category")}
          <input
            list="category-suggestions"
            value={category()}
            onInput={(e) => setCategory(e.currentTarget.value)}
          />
          <datalist id="category-suggestions">
            <For each={categories()}>{(c) => <option value={c} />}</For>
          </datalist>
        </label>
        <Show when={(categories()?.length ?? 0) > 0}>
          <div class="chips">
            <For each={categories()?.slice(0, 8)}>
              {(c) => (
                <button type="button" class="chip-button" onClick={() => setCategory(c)}>
                  {c}
                </button>
              )}
            </For>
          </div>
        </Show>
        <fieldset>
          <legend>{t("itemForm.visibility")}</legend>
          <label class="check">
            <input
              type="radio"
              name="visibility"
              checked={allGroups()}
              onChange={() => setAllGroups(true)}
            />
            {t("itemForm.allGroups")}
          </label>
          <label class="check">
            <input
              type="radio"
              name="visibility"
              checked={!allGroups()}
              onChange={() => setAllGroups(false)}
            />
            {t("itemForm.selectedGroups")}
          </label>
          <Show when={!allGroups()}>
            <div class="indent">
              <For
                each={profile()?.groups}
                fallback={<p class="muted small">{t("itemForm.noGroups")}</p>}
              >
                {(group) => (
                  <label class="check">
                    <input
                      type="checkbox"
                      checked={groupIds().includes(group.id)}
                      onChange={(e) => toggleGroup(group.id, e.currentTarget.checked)}
                    />
                    {group.name}
                  </label>
                )}
              </For>
            </div>
          </Show>
        </fieldset>
        <button type="submit" disabled={busy()}>
          {busy() ? t("common.saving") : t("common.save")}
        </button>
        <button type="button" class="secondary" onClick={() => history.back()}>
          {t("common.cancel")}
        </button>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
    </>
  );
}
