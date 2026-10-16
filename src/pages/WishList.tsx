import { A, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Match, Show, Switch } from "solid-js";
import { deleteItem, getItems, type Item } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { getPurchases, markBought, undoBought } from "../lib/api/purchases.ts";
import { useMe } from "../lib/me.tsx";

export default function WishList() {
  const params = useParams<{ profileId: string }>();
  const me = useMe();

  const [profile] = createResource(() => params.profileId, getProfileDetails);
  const [items, { refetch: refetchItems }] = createResource(() => params.profileId, getItems);
  // Runs again whenever the items change. The database leaves out purchases on your own list.
  const [purchases, { refetch: refetchPurchases }] = createResource(
    () => items()?.map((item) => item.id),
    getPurchases,
  );
  const [error, setError] = createSignal<string>();

  const isOwnList = () => profile()?.account_id === me().accountId;
  const canEdit = () => isOwnList() || (profile()?.managerIds.includes(me().profile.id) ?? false);
  const boughtBy = createMemo(
    () => new Map((purchases() ?? []).map((p) => [p.item_id, p.bought_by] as const)),
  );
  const groupName = (id: string) => profile()?.groups.find((g) => g.id === id)?.name ?? "a group";

  async function run(action: () => Promise<void>) {
    setError(undefined);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const onDelete = (item: Item) =>
    run(async () => {
      if (!confirm(`Remove "${item.name}" from the list?`)) return;
      await deleteItem(item.id);
      await refetchItems();
    });
  const onBuy = (item: Item) => run(() => markBought(item.id).then(() => void refetchPurchases()));
  const onUndo = (item: Item) => run(() => undoBought(item.id).then(() => void refetchPurchases()));

  return (
    <>
      <h1>
        <Show when={profile()} fallback="Wishlist">
          {(p) => (isOwnList() ? "My wishlist" : `${p().display_name}'s wishlist`)}
        </Show>
      </h1>
      <Show when={isOwnList() && !me().managed()?.length}>
        <A class="link" href="/mine">
          Your name and sign out
        </A>
      </Show>
      <Show when={profile.error || items.error}>
        <p class="error">This list isn't available. It may not be shared with you.</p>
      </Show>
      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>
      <Show when={items()?.length === 0}>
        <p class="muted">{canEdit() ? "Nothing on this list yet." : "This list is still empty."}</p>
      </Show>
      <ul class="list cards">
        <For each={items()}>
          {(item) => (
            <li class="card item">
              <div class="row">
                <strong class="item-name">{item.name}</strong>
                <Show when={item.category}>
                  <span class="chip">{item.category}</span>
                </Show>
              </div>
              <Show when={item.url}>
                {(url) => (
                  <a class="link truncate" href={url()} target="_blank" rel="noopener noreferrer">
                    {url()}
                  </a>
                )}
              </Show>
              <Show when={canEdit() && !item.visible_in_all_groups}>
                <p class="muted small">
                  Only visible in{" "}
                  {item.item_groups.map((g) => groupName(g.group_id)).join(", ") || "no groups"}
                </p>
              </Show>
              <Show when={!isOwnList()}>
                <Switch>
                  <Match when={boughtBy().get(item.id) === me().accountId}>
                    <div class="row">
                      <span class="bought">You bought this</span>
                      <button type="button" class="secondary small" onClick={() => onUndo(item)}>
                        Undo
                      </button>
                    </div>
                  </Match>
                  <Match when={boughtBy().has(item.id)}>
                    <span class="bought">Someone bought this</span>
                  </Match>
                  <Match when={purchases()}>
                    <button type="button" onClick={() => onBuy(item)}>
                      I bought this
                    </button>
                  </Match>
                </Switch>
              </Show>
              <Show when={canEdit()}>
                <div class="row">
                  <A class="link" href={`/items/${item.id}/edit`}>
                    Edit
                  </A>
                  <button type="button" class="link danger" onClick={() => onDelete(item)}>
                    Remove
                  </button>
                </div>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Show when={canEdit()}>
        <A class="button fab" href={`/lists/${params.profileId}/items/new`}>
          + Add item
        </A>
      </Show>
    </>
  );
}
