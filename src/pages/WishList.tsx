import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { ItemCard, type PurchaseState } from "../components/ItemCard.tsx";
import { QuickAdd } from "../components/QuickAdd.tsx";
import { deleteChild } from "../lib/api/children.ts";
import { deleteItem, getItems, type Item } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { getPurchases, markBought, undoBought } from "../lib/api/purchases.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, ProfileId } from "../lib/ids.ts";
import { useMe } from "../lib/me.tsx";
import { useQuickAdd } from "../lib/quickAdd.ts";

export default function WishList() {
  const params = useParams<{ profileId: ProfileId }>();
  const me = useMe();
  const navigate = useNavigate();

  const [profile] = createResource(() => params.profileId, getProfileDetails);
  const [items, { refetch: refetchItems, mutate: setItems }] = createResource(
    () => params.profileId,
    getItems,
  );
  // A memo, so moving to another list switches queues (and flushes the old one).
  const quickAdd = createMemo(() =>
    useQuickAdd(params.profileId, (saved) => setItems((prev) => [...(prev ?? []), ...saved])),
  );
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
  const groupName = (id: GroupId) =>
    profile()?.groups.find((g) => g.id === id)?.name ?? t("wishlist.aGroup");

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
      if (!confirm(t("wishlist.confirmRemoveItem", { item: item.name }))) return;
      await deleteItem(item.id);
      await refetchItems();
    });
  const onDeleteChild = () =>
    run(async () => {
      const name = profile()!.display_name;
      if (!confirm(t("child.confirmDelete", { name }))) return;
      await deleteChild(params.profileId);
      me().refetchManaged();
      navigate("/mine", { replace: true });
    });
  const onBuy = (item: Item) => run(() => markBought(item.id).then(() => void refetchPurchases()));
  const onUndo = (item: Item) => run(() => undoBought(item.id).then(() => void refetchPurchases()));

  return (
    <>
      <h1>
        <Show when={profile()} fallback={t("wishlist.fallbackTitle")}>
          {(p) =>
            isOwnList() ? t("wishlist.mine") : t("wishlist.theirs", { name: p().display_name })
          }
        </Show>
      </h1>
      <Show when={isOwnList() && !me().managed()?.length}>
        <A class="link" href="/mine">
          {t("wishlist.accountLink")}
        </A>
      </Show>
      <Show when={profile.error || items.error}>
        <p class="error">{t("wishlist.unavailable")}</p>
      </Show>
      <Show when={error()}>
        <p class="error">{error()}</p>
      </Show>
      <Show when={items()?.length === 0 && quickAdd().state().pending.length === 0}>
        <p class="muted">{canEdit() ? t("wishlist.emptyOwn") : t("wishlist.empty")}</p>
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
      <Show when={canEdit()}>
        <QuickAdd
          pending={quickAdd().state().pending}
          retrying={quickAdd().state().retrying}
          onAdd={(name) => quickAdd().add(name)}
          onCancel={() => quickAdd().cancel()}
        />
      </Show>
      <Show when={canEdit() && !isOwnList()}>
        <button type="button" class="secondary danger" onClick={onDeleteChild}>
          {t("wishlist.deleteProfile", { name: profile()?.display_name ?? "" })}
        </button>
      </Show>
      <Show when={canEdit()}>
        <A class="button fab" href={`/lists/${params.profileId}/items/new`}>
          {t("wishlist.addItem")}
        </A>
      </Show>
    </>
  );
}
