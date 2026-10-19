import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { ItemCard, type PurchaseState } from "../components/ItemCard.tsx";
import { deleteChild } from "../lib/api/children.ts";
import { deleteItem, getItems, type Item } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { getPurchases, markBought, undoBought } from "../lib/api/purchases.ts";
import { useMe } from "../lib/me.tsx";

export default function WishList() {
  const params = useParams<{ profileId: string }>();
  const me = useMe();
  const navigate = useNavigate();

  const [profile] = createResource(() => params.profileId, getProfileDetails);
  const [items, { refetch: refetchItems }] = createResource(() => params.profileId, getItems);
  // Runs again whenever the items change. The database leaves out purchases on your own list.
  const [purchases, { refetch: refetchPurchases }] = createResource(
    () => items()?.map((item) => item.id),
    getPurchases,
  );
  const [error, setError] = createSignal<string>();

  const isOwnList = () => profile()?.id === me().profile.id;
  const canEdit = () => isOwnList() || (profile()?.managerIds.includes(me().profile.id) ?? false);
  const boughtBy = createMemo(
    () => new Map((purchases() ?? []).map((p) => [p.item_id, p.bought_by] as const)),
  );
  const purchase = (item: Item): PurchaseState => {
    if (isOwnList() || !purchases()) return "hidden";
    const buyer = boughtBy().get(item.id);
    if (buyer === undefined) return "available";
    return buyer === me().profile.id ? "mine" : "someone";
  };
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
  const onDeleteChild = () =>
    run(async () => {
      const name = profile()!.display_name;
      if (!confirm(`Delete ${name}'s profile and wishlist for everyone? This can't be undone.`))
        return;
      await deleteChild(params.profileId);
      me().refetchManaged();
      navigate("/mine", { replace: true });
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
            <ItemCard
              item={item}
              purchase={purchase(item)}
              canEdit={canEdit()}
              groupNames={item.item_groups.map((g) => groupName(g.group_id))}
              onBuy={() => onBuy(item)}
              onUndo={() => onUndo(item)}
              onRemove={() => onDelete(item)}
            />
          )}
        </For>
      </ul>
      <Show when={canEdit() && !isOwnList()}>
        <button type="button" class="secondary danger" onClick={onDeleteChild}>
          Delete {profile()?.display_name}'s profile
        </button>
      </Show>
      <Show when={canEdit()}>
        <A class="button fab" href={`/lists/${params.profileId}/items/new`}>
          + Add item
        </A>
      </Show>
    </>
  );
}
