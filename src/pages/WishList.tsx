import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { Avatar } from "../components/Avatar.tsx";
import { BulkActions } from "../components/BulkActions.tsx";
import { ListMenu } from "../components/ListMenu.tsx";
import { FollowList } from "../components/FollowList.tsx";
import { ItemCard } from "../components/ItemCard.tsx";
import { ListOrderSelect } from "../components/ListOrderSelect.tsx";
import { QuickAdd, QuickAddButton } from "../components/QuickAdd.tsx";
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
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createBulkSelect } from "../lib/createBulkSelect.ts";
import { createFollow } from "../lib/createFollow.ts";
import { createListSections } from "../lib/createListSections.ts";
import { createPurchases } from "../lib/createPurchases.ts";
import { t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import { addDays, today } from "../lib/occasions.ts";
import { useMe } from "../lib/me.tsx";
import { isReady } from "../lib/resource.ts";
import { useQuickAdd } from "../lib/quickAdd.ts";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import styles from "./WishList.module.css";

/** How long you follow a list when no shared occasion is coming up. */
const DEFAULT_FOLLOW_DAYS = 30;

/** How long the "you're now following" tooltip stays. */
const FOLLOWED_NOTICE_MS = 3500;

export default function WishList() {
  const params = useParams<{ profileId: ProfileId }>();
  const navigate = useNavigate();
  const me = useMe();
  // Parents jump between their own list and their children's from a menu beside the title.
  const switchOptions = () => [
    { id: me().profile.id, name: t("nav.myList"), person: me().profile.display_name },
    ...(me().managed() ?? []).map((child) => ({
      id: child.id,
      name: t("account.childWishlist", { name: child.display_name }),
      person: child.display_name,
    })),
  ];
  const showSwitcher = () =>
    switchOptions().length > 1 && switchOptions().some((o) => o.id === params.profileId);

  const runner = createActionRunner();
  const { error, run } = runner;

  const [profile] = createResource(() => params.profileId, getProfileDetails);
  const [items, { refetch: refetchItems, mutate: setItems }] = createResource(
    () => params.profileId,
    getItems,
  );
  // A memo, so moving to another list switches queues (and flushes the old one).
  const quickAdd = createMemo(() =>
    useQuickAdd(params.profileId, (saved) => setItems((prev) => [...(prev ?? []), ...saved])),
  );

  // Known from the address alone, so your own list never renders as someone else's while loading.
  const isOwnList = () => params.profileId === me().profile.id;
  // Who may edit and what to show depend on both, so nothing below the title renders before them.
  const ready = () => isReady(profile) && isReady(items);
  const canEdit = () => isOwnList() || (profile()?.managerIds.includes(me().profile.id) ?? false);

  // Only loaded once we know it isn't your own list.
  const otherList = () => (profile() && !isOwnList() ? params.profileId : undefined);
  const follow = createFollow(() => params.profileId, otherList, runner);
  const isFollowing = () => {
    const until = follow.followUntil.latest;
    return until != null && until >= today();
  };
  // Buying follows the list for you; the bell wiggles and says so for a moment.
  const [justFollowed, setJustFollowed] = createSignal(false);
  let followedTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(followedTimer));
  const onBought = async () => {
    const was = isFollowing();
    await follow.refetchFollow();
    if (was || !isFollowing()) return;
    setJustFollowed(true);
    clearTimeout(followedTimer);
    followedTimer = setTimeout(() => setJustFollowed(false), FOLLOWED_NOTICE_MS);
  };
  // Reading a failed resource throws, so the helpers see "no items" and the page shows its error.
  const loadedItems = () => (items.error ? undefined : items());
  const purchases = createPurchases(
    loadedItems,
    isOwnList,
    () => me().profile.id,
    runner,
    onBought,
  );
  const listSections = createListSections(loadedItems, () =>
    purchases.showBought() ? (item) => purchases.purchaseOf().has(item.id) : undefined,
  );
  const { sections, notWanted, isGrouped } = listSections;
  const groupName = (id: GroupId) =>
    profile()?.groups.find((g) => g.id === id)?.name ?? t("wishlist.aGroup");

  const select = createBulkSelect(loadedItems);
  const [bulkBusy, runBulk] = runner.busyRunner();
  // Only loaded once someone starts selecting, for the category suggestions.
  const [categories] = createResource(select.selecting, () => getCategories());
  const suggest = (typed: string) =>
    suggestCategories(
      categories() ?? [],
      starterCategoryKeys.map((key) => t(`categories.${key}`)),
      typed,
    );

  const onDelete = (item: Item) =>
    run(async () => {
      if (!confirm(t("wishlist.confirmRemoveItem", { item: item.name }))) return;
      await deleteItem(item.id);
      await refetchItems();
    });
  const bulk = (action: (ids: ItemId[]) => Promise<void>) =>
    runBulk(async () => {
      await action(select.selectedIds());
      await refetchItems();
    });
  const onBulkCategory = (category: string | null) =>
    bulk((ids) => setItemsCategory(ids, category));
  const onBulkGroups = (groups: GroupSelection) => bulk((ids) => setItemsGroups(ids, groups));
  const onBulkDelete = () => {
    const count = select.selectedIds().length;
    if (!confirm(t("bulk.confirmDelete", { count }))) return;
    void bulk(async (ids) => {
      await deleteItems(ids);
      select.selectNone();
    });
  };

  const card = (item: Item) => (
    <ItemCard
      item={item}
      purchase={purchases.purchase(item)}
      canEdit={canEdit()}
      groupNames={item.item_groups.map((g) => groupName(g.group_id))}
      boughtFor={purchases.purchaseOf().get(item.id)?.occasion?.name}
      onBuy={() => purchases.onBuy(item)}
      occasionChoices={purchases.occasionChoices(item)}
      onPickOccasion={(occasionId) => purchases.buy(item, occasionId)}
      onCancelPick={purchases.cancelPick}
      onUndo={() => purchases.onUndo(item)}
      onRemove={() => onDelete(item)}
      selecting={select.selecting()}
      selected={select.selected().has(item.id)}
      onToggleSelect={() => select.toggle(item.id)}
    />
  );

  return (
    <>
      <div class={u.row}>
        <div class={styles.title}>
          <Show when={profile()}>
            {(p) => <Avatar id={params.profileId} name={p().display_name} size="lg" />}
          </Show>
          <h1>
            <Show when={!isOwnList()} fallback={t("wishlist.mine")}>
              <Show when={profile()} fallback={t("wishlist.fallbackTitle")}>
                {(p) => t("wishlist.theirs", { name: p().display_name })}
              </Show>
            </Show>
          </h1>
          <Show when={showSwitcher()}>
            <ListMenu value={params.profileId} options={switchOptions()} />
          </Show>
          <Show
            when={
              otherList() && follow.followUntil.latest !== undefined && !follow.nextOccasion.loading
            }
          >
            <FollowList
              name={profile()?.display_name ?? ""}
              until={follow.followUntil.latest ?? null}
              suggestedUntil={follow.nextOccasion()?.date ?? addDays(today(), DEFAULT_FOLLOW_DAYS)}
              suggestedOccasion={follow.nextOccasion()?.name}
              today={today()}
              busy={follow.busy()}
              onFollow={follow.follow}
              onUnfollow={follow.unfollow}
              justFollowed={justFollowed()}
            />
          </Show>
        </div>
      </div>
      <Show when={profile.error || items.error}>
        <p class={u.error}>{t("wishlist.unavailable")}</p>
      </Show>
      <Show when={!ready() && !profile.error && !items.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      <Show when={ready()}>
        <Show when={error()}>
          <p class={u.error}>{error()}</p>
        </Show>
        <Show when={items()?.length === 0 && quickAdd().state().pending.length === 0}>
          <EmptyState>
            <p class={u.muted}>{canEdit() ? t("wishlist.emptyOwn") : t("wishlist.empty")}</p>
            <Show when={canEdit() && !select.selecting()}>
              <div class={styles.emptyQuickAdd}>
                <QuickAddButton inline />
              </div>
            </Show>
          </EmptyState>
        </Show>
        <Show when={(items()?.length ?? 0) > 1}>
          <div class={u.row}>
            <Show when={canEdit() && !select.selecting()}>
              <Button
                variant="secondary"
                size="small"
                class={styles.selectButton}
                onClick={select.start}
              >
                <span class={u.labelText}>{t("bulk.select")}</span>
                {/* Lucide "list-checks" (ISC licence): stands in for the label on small screens. */}
                <svg
                  class={u.labelIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m3 17 2 2 4-4" />
                  <path d="m3 7 2 2 4-4" />
                  <path d="M13 6h8" />
                  <path d="M13 12h8" />
                  <path d="M13 18h8" />
                </svg>
              </Button>
            </Show>
            <ListOrderSelect
              value={listSections.order()}
              showBought={purchases.showBought()}
              onChange={listSections.chooseOrder}
            />
          </div>
        </Show>
        <For each={sections()}>
          {(section) => (
            <section class={u.stack}>
              <Show when={isGrouped()}>
                <h2>{section.category ?? t("listOrder.uncategorised")}</h2>
              </Show>
              <ul class={`${u.list} ${u.cards}`}>
                <For each={section.items}>{card}</For>
              </ul>
            </section>
          )}
        </For>
        <Show when={notWanted().length > 0}>
          <section class={u.stack}>
            <h2>{t("listOrder.notWanted")}</h2>
            <ul class={`${u.list} ${u.cards}`}>
              <For each={notWanted()}>{card}</For>
            </ul>
          </section>
        </Show>
        <Show when={select.selecting()}>
          <BulkActions
            selected={select.selectedIds().length}
            total={items()?.length ?? 0}
            groups={profile()?.groups ?? []}
            suggestCategories={suggest}
            busy={bulkBusy()}
            onSelectAll={select.selectAll}
            onSelectNone={select.selectNone}
            onSetCategory={onBulkCategory}
            onSetGroups={onBulkGroups}
            onDelete={onBulkDelete}
            onDone={select.stop}
          />
        </Show>
        <Show when={canEdit() && !select.selecting()}>
          <QuickAdd
            pending={quickAdd().state().pending}
            groups={profile()?.groups ?? []}
            retrying={quickAdd().state().retrying}
            onAdd={(name, groups) => quickAdd().add(name, groups)}
            onCancel={() => quickAdd().cancel()}
            onOpenForm={(draft) =>
              navigate(`/lists/${params.profileId}/items/new`, { state: draft })
            }
          />
        </Show>
      </Show>
    </>
  );
}
