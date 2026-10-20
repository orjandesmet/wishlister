import { A, useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { BulkActions } from "../components/BulkActions.tsx";
import { ItemCard, type PurchaseState } from "../components/ItemCard.tsx";
import { ListOrderSelect } from "../components/ListOrderSelect.tsx";
import { QuickAdd } from "../components/QuickAdd.tsx";
import { deleteChild } from "../lib/api/children.ts";
import {
  deleteItem,
  deleteItems,
  getCategories,
  getItems,
  setItemsCategory,
  setItemsGroups,
  type GroupSelection,
  type Item,
} from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { getPurchases, markBought, undoBought } from "../lib/api/purchases.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { compareNames, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import { arrangeItems, readListOrder, saveListOrder, type ListOrder } from "../lib/listOrder.ts";
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

  // Bulk edit: tick items, then apply one action to all of them.
  const [selecting, setSelecting] = createSignal(false);
  const [selected, setSelected] = createSignal<ReadonlySet<ItemId>>(new Set());
  const [bulkBusy, setBulkBusy] = createSignal(false);
  // Only loaded once someone starts selecting, for the category suggestions.
  const [categories] = createResource(selecting, () => getCategories());
  const suggest = (typed: string) =>
    suggestCategories(
      categories() ?? [],
      starterCategoryKeys.map((key) => t(`categories.${key}`)),
      typed,
    );
  // Items deleted elsewhere drop out of the selection when the list reloads.
  const selectedIds = createMemo(() =>
    (items() ?? []).map((item) => item.id).filter((id) => selected().has(id)),
  );
  const toggleSelected = (id: ItemId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set<ItemId>());
  };

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
  // The same choice on every list, remembered on this device.
  const [order, setOrder] = createSignal<ListOrder>(readListOrder());
  const chooseOrder = (next: ListOrder) => {
    setOrder(next);
    saveListOrder(next);
  };
  // Owners never learn what was bought, so "not bought first" only exists on other lists.
  const showBought = () => !isOwnList() && purchases() !== undefined;
  const sections = createMemo(() => {
    const list = items() ?? [];
    return arrangeItems(list, order(), {
      compare: compareNames,
      isBought: showBought() ? (i) => boughtBy().has(list[i].id) : undefined,
    });
  });
  const isGrouped = () => sections().some((s) => s.category !== null);
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
  async function bulk(action: (ids: ItemId[]) => Promise<void>) {
    setBulkBusy(true);
    await run(async () => {
      await action(selectedIds());
      await refetchItems();
    });
    setBulkBusy(false);
  }
  const onBulkCategory = (category: string | null) =>
    bulk((ids) => setItemsCategory(ids, category));
  const onBulkGroups = (groups: GroupSelection) => bulk((ids) => setItemsGroups(ids, groups));
  const onBulkDelete = () => {
    const count = selectedIds().length;
    if (!confirm(t("bulk.confirmDelete", { count }))) return;
    void bulk(async (ids) => {
      await deleteItems(ids);
      setSelected(new Set<ItemId>());
    });
  };
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
      <div class="row">
        <h1>
          <Show when={profile()} fallback={t("wishlist.fallbackTitle")}>
            {(p) =>
              isOwnList() ? t("wishlist.mine") : t("wishlist.theirs", { name: p().display_name })
            }
          </Show>
        </h1>
        <Show when={canEdit() && !selecting() && (items()?.length ?? 0) > 1}>
          <button type="button" class="secondary small" onClick={() => setSelecting(true)}>
            {t("bulk.select")}
          </button>
        </Show>
      </div>
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
      <Show when={(items()?.length ?? 0) > 1}>
        <ListOrderSelect value={order()} showBought={showBought()} onChange={chooseOrder} />
      </Show>
      <For each={sections()}>
        {(section) => (
          <section class="stack">
            <Show when={isGrouped()}>
              <h2>{section.category ?? t("listOrder.uncategorised")}</h2>
            </Show>
            <ul class="list cards">
              <For each={section.items}>
                {(item) => (
                  <ItemCard
                    item={item}
                    purchase={purchase(item)}
                    canEdit={canEdit()}
                    groupNames={item.item_groups.map((g) => groupName(g.group_id))}
                    onBuy={() => onBuy(item)}
                    onUndo={() => onUndo(item)}
                    onRemove={() => onDelete(item)}
                    selecting={selecting()}
                    selected={selected().has(item.id)}
                    onToggleSelect={() => toggleSelected(item.id)}
                  />
                )}
              </For>
            </ul>
          </section>
        )}
      </For>
      <Show when={selecting()}>
        <BulkActions
          selected={selectedIds().length}
          total={items()?.length ?? 0}
          groups={profile()?.groups ?? []}
          suggestCategories={suggest}
          busy={bulkBusy()}
          onSelectAll={() => setSelected(new Set((items() ?? []).map((item) => item.id)))}
          onSelectNone={() => setSelected(new Set<ItemId>())}
          onSetCategory={onBulkCategory}
          onSetGroups={onBulkGroups}
          onDelete={onBulkDelete}
          onDone={stopSelecting}
        />
      </Show>
      <Show when={canEdit() && !selecting()}>
        <QuickAdd
          pending={quickAdd().state().pending}
          groups={profile()?.groups ?? []}
          retrying={quickAdd().state().retrying}
          onAdd={(name, groups) => quickAdd().add(name, groups)}
          onCancel={() => quickAdd().cancel()}
        />
      </Show>
      <Show when={canEdit() && !isOwnList() && !selecting()}>
        <button type="button" class="secondary danger" onClick={onDeleteChild}>
          {t("wishlist.deleteProfile", { name: profile()?.display_name ?? "" })}
        </button>
      </Show>
      <Show when={canEdit() && !selecting()}>
        <A class="button fab" href={`/lists/${params.profileId}/items/new`}>
          {t("wishlist.addItem")}
        </A>
      </Show>
    </>
  );
}
