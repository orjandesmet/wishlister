import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, For, on, Show } from "solid-js";
import { addItem, getCategories, getItem, getProfileDetails, updateItem } from "../lib/api.ts";

/** Add an item (/lists/:profileId/items/new) or edit one (/items/:itemId/edit). */
export default function ItemForm() {
  const params = useParams<{ profileId?: string; itemId?: string }>();
  const navigate = useNavigate();

  const [item] = createResource(() => params.itemId, getItem);
  const profileId = () => params.profileId ?? item()?.profile_id;
  const [profile] = createResource(profileId, getProfileDetails);
  const [categories] = createResource(getCategories);

  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [allGroups, setAllGroups] = createSignal(true);
  const [groupIds, setGroupIds] = createSignal<string[]>([]);
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

  const toggleGroup = (id: string, checked: boolean) =>
    setGroupIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!allGroups() && groupIds().length === 0) {
      setError("Pick at least one group, or show the item in all groups.");
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
      <h1>{params.itemId ? "Edit item" : "Add item"}</h1>
      <form class="card" onSubmit={onSubmit}>
        <label>
          Name
          <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <label>
          Link (optional)
          <input
            type="url"
            inputmode="url"
            placeholder="https://"
            value={url()}
            onInput={(e) => setUrl(e.currentTarget.value)}
          />
        </label>
        <label>
          Category (optional)
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
          <legend>Who can see it</legend>
          <label class="check">
            <input
              type="radio"
              name="visibility"
              checked={allGroups()}
              onChange={() => setAllGroups(true)}
            />
            All my groups
          </label>
          <label class="check">
            <input
              type="radio"
              name="visibility"
              checked={!allGroups()}
              onChange={() => setAllGroups(false)}
            />
            Only selected groups
          </label>
          <Show when={!allGroups()}>
            <div class="indent">
              <For
                each={profile()?.groups}
                fallback={<p class="muted small">This list isn't in any groups yet.</p>}
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
          {busy() ? "Saving…" : "Save"}
        </button>
        <button type="button" class="secondary" onClick={() => history.back()}>
          Cancel
        </button>
        <Show when={error()}>
          <p class="error">{error()}</p>
        </Show>
      </form>
    </>
  );
}
