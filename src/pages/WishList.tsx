import { Icon } from "../components/Icon.tsx";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createResource, For, Show } from "solid-js";
import { Avatar } from "../components/Avatar.tsx";
import { BulkActions } from "../components/BulkActions.tsx";
import { CleanupDialog } from "../components/CleanupDialog.tsx";
import { ListMenu } from "../components/ListMenu.tsx";
import { SecretSantaNudge } from "../components/secret-santa/SecretSantaNudge.tsx";
import { SecretSantaRibbon } from "../components/secret-santa/SecretSantaRibbon.tsx";
import { FollowList } from "../components/FollowList.tsx";
import { CompactToggle } from "../components/CompactToggle.tsx";
import { ItemCard } from "../components/ItemCard.tsx";
import { ItemQuestions } from "../components/ItemQuestions.tsx";
import { ItemTable } from "../components/ItemTable.tsx";
import { ListViewSwitch } from "../components/ListViewSwitch.tsx";
import { ListOrderSelect } from "../components/ListOrderSelect.tsx";
import { QuickAdd, QuickAddButton } from "../components/QuickAdd.tsx";
import {
  deleteItem,
  deleteItems,
  getCategories,
  setItemsCategory,
  setItemsGroups,
  setWantedLevel,
  type GroupSelection,
  type Item,
  type WantedLevel,
} from "../lib/api/items.ts";
import { cleanUpBoughtItems, getPendingCleanup } from "../lib/api/cleanup.ts";
import { announce, focusHeading, focusSoon, usePageTitle } from "../lib/a11y.ts";
import { animateMoves } from "../lib/animateMoves.ts";
import { setProfileCardView } from "../lib/api/profiles.ts";
import { NUDGE_EVERY_DAYS } from "../lib/api/secretSanta.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { chooseCardView } from "../lib/cardView.ts";
import { showDelivery } from "../lib/showDelivery.ts";
import { chooseListView, listView, tableFits } from "../lib/listView.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createBulkSelect } from "../lib/createBulkSelect.ts";
import { createFollow } from "../lib/createFollow.ts";
import { createListSections } from "../lib/createListSections.ts";
import { createPurchases } from "../lib/createPurchases.ts";
import { createQuestions } from "../lib/createQuestions.ts";
import { createSecretSantaNudge } from "../lib/createSecretSantaNudge.ts";
import { compareNames, formatList, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import { addDays, today } from "../lib/occasions.ts";
import { useMe } from "../lib/me.tsx";
import { listMenuSections } from "../lib/listMenu.ts";
import { isReady, loaded } from "../lib/resource.ts";
import { createCachedResource } from "../lib/cache.ts";
import { loadDrawnPeople, loadItems, loadMyGroups, loadProfileDetails } from "../lib/loaders.ts";
import { useQuickAdd } from "../lib/quickAdd.ts";
import { nextWantedLevel } from "../lib/wantedLevel.ts";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { EmptyState } from "../components/EmptyState.tsx";
import styles from "./WishList.module.css";

/** How long you follow a list when no shared occasion is coming up. */
const DEFAULT_FOLLOW_DAYS = 30;

export default function WishList() {
  const params = useParams<{ profileId: ProfileId }>();
  const navigate = useNavigate();
  const me = useMe();
  // A menu beside the title opens your own list, your children's, or anyone's from your groups.
  // The groups are an extra: if they fail to load, the menu still has your own lists.
  const [groups] = createCachedResource(() => true, loadMyGroups);
  // The people you drew in a Secret Santa get a ribbon. Another extra: no ribbons if it fails.
  const [drawnPeople] = createCachedResource(() => true, loadDrawnPeople);
  const drawn = () => loaded(drawnPeople) ?? [];
  const menuSections = () =>
    listMenuSections(
      [
        { id: me().profile.id, name: t("nav.myList"), person: me().profile.display_name },
        ...(me().managed() ?? []).map((child) => ({
          id: child.id,
          name: t("account.childWishlist", { name: child.display_name }),
          person: child.display_name,
        })),
      ],
      loaded(groups) ?? [],
      compareNames,
      drawn().map((d) => d.recipient_profile_id),
    );
  const showMenu = () => menuSections().flatMap((section) => section.options).length > 1;

  const runner = createActionRunner();
  const { error, run } = runner;

  // The person you drew can be nudged for ideas when their list has few items you could buy.
  const drawnHere = () => drawn().find((d) => d.recipient_profile_id === params.profileId);
  const nudge = createSecretSantaNudge(
    () => params.profileId,
    () => !!drawnHere(),
    () => profile()?.display_name ?? "",
    runner,
  );

  // A list you opened before (or that was loaded ahead, see prefetch.ts) shows at once,
  // and loads again in the background.
  const [profile] = createCachedResource(() => params.profileId, loadProfileDetails);
  const [items, { refetch: refetchItems, mutate: setItems }] = createCachedResource(
    () => params.profileId,
    loadItems,
  );
  // A memo, so moving to another list switches queues (and flushes the old one).
  const quickAdd = createMemo(() =>
    useQuickAdd(params.profileId, (saved) => {
      setItems((prev) => [...(prev ?? []), ...saved]);
      announce(t("a11y.added", { items: formatList(saved.map((item) => item.name)) }));
    }),
  );

  // Known from the address alone, so your own list never renders as someone else's while loading.
  const isOwnList = () => params.profileId === me().profile.id;
  // Who may edit and what to show depend on both, so nothing below the title renders before them.
  const ready = () => isReady(profile) && isReady(items);
  const canEdit = () => isOwnList() || (profile()?.managerIds.includes(me().profile.id) ?? false);
  const title = () => {
    if (isOwnList()) return t("wishlist.mine");
    const p = loaded(profile);
    return p ? t("wishlist.theirs", { name: p.display_name }) : t("wishlist.fallbackTitle");
  };
  usePageTitle(title);

  // Only loaded once we know it isn't your own list.
  const otherList = () => (profile() && !isOwnList() ? params.profileId : undefined);
  const follow = createFollow(() => params.profileId, otherList, runner);
  // Reading a failed resource throws, so the helpers see "no items" and the page shows its error.
  const loadedItems = () => loaded(items);
  const purchases = createPurchases(
    loadedItems,
    isOwnList,
    () => me().profile.id,
    runner,
    follow.afterBuying,
    (gone) => {
      setItems((prev) => prev?.filter((item) => item.id !== gone.id));
      // Its card, and the Undo button just pressed, are gone.
      focusHeading();
    },
  );
  // Anonymous questions about items. The link in their emails opens one item's
  // questions straight away (?questions=<item id>).
  const questions = createQuestions(loadedItems);
  const [search, setSearch] = useSearchParams<{ questions?: string }>();
  const closeQuestions = (item: Item) => {
    questions.clearError();
    if (search.questions === item.id) setSearch({ questions: undefined }, { replace: true });
  };

  // After an occasion, its bought items go: the list's editors get one dialog with all of
  // them, checked, and uncheck what stays. Only from the day after, so nothing is given away
  // before; the database decides that too.
  const [pendingCleanup, { refetch: refetchCleanup }] = createResource(
    () => (canEdit() ? params.profileId : undefined),
    getPendingCleanup,
  );
  const cleanupItems = () => loaded(pendingCleanup) ?? [];
  // Its own runner: what goes wrong shows in the dialog, not on the page behind it.
  const cleanup = createActionRunner();
  const [cleanupBusy, runCleanup] = cleanup.busyRunner();
  const onCleanUp = (removeIds: ItemId[]) =>
    runCleanup(async () => {
      await cleanUpBoughtItems(params.profileId, removeIds);
      await Promise.all([refetchItems(), refetchCleanup()]);
      announce(t("cleanup.done"));
      focusHeading();
    });

  // oxlint-disable-next-line no-unassigned-vars
  let cardsRoot: HTMLDivElement | undefined;
  const listSections = createListSections(
    loadedItems,
    () => (purchases.showBought() ? (item) => purchases.purchaseOf().has(item.id) : undefined),
    (apply) => animateMoves(cardsRoot, apply),
    (item) => questions.of(item.id).length,
  );
  const { itemsIn, notWanted, isGrouped } = listSections;
  const groupName = (id: GroupId) =>
    profile()?.groups.find((g) => g.id === id)?.name ?? t("wishlist.aGroup");

  const select = createBulkSelect(loadedItems);
  // The Select button and the cards' buttons swap with checkboxes, so focus goes to the first
  // checkbox, and back to Select when done.
  // oxlint-disable-next-line no-unassigned-vars
  let selectButton: HTMLButtonElement | undefined;
  const startSelecting = () => {
    select.start();
    focusSoon(() => document.querySelector<HTMLElement>("main input[type=checkbox]"));
  };
  const stopSelecting = () => {
    select.stop();
    focusSoon(() => selectButton);
  };
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
      // Its card, and the button just pressed, are gone.
      announce(t("a11y.removed", { item: item.name }));
      focusHeading();
    });
  // The hearts go round: I want this, I really want this, I really, really, REALLY want this.
  // Shown at once; the card (and the pressed button) stays, so focus does too.
  // One save at a time, so quick taps reach the database in the order they were made.
  let savingWant: Promise<unknown> = Promise.resolve();
  const onChangeWant = (item: Item) =>
    (savingWant = savingWant.then(() =>
      run(async () => {
        const level = nextWantedLevel(item.wanted_level);
        const was = item.wanted_level;
        const id = item.id;
        const setLevel = (to: WantedLevel) =>
          setItems((prev) =>
            prev?.map((other) => (other.id === id ? { ...other, wanted_level: to } : other)),
          );
        listSections.holdPlace(item);
        setLevel(level);
        announce(t("a11y.wantedLevel", { item: item.name, level: t(`item.wantedLevel${level}`) }));
        try {
          await setWantedLevel(id, level);
        } catch (e) {
          setLevel(was);
          throw e;
        }
      }),
    ));
  const bulk = (action: (ids: ItemId[]) => Promise<void>, done: (count: number) => string) => {
    const count = select.selectedIds().length;
    return runBulk(async () => {
      await action(select.selectedIds());
      await refetchItems();
      announce(done(count));
    });
  };
  const changed = (count: number) => t("a11y.changed", { count });
  const onBulkCategory = (category: string | null) =>
    bulk((ids) => setItemsCategory(ids, category), changed);
  const onBulkGroups = (groups: GroupSelection) =>
    bulk((ids) => setItemsGroups(ids, groups), changed);
  const onBulkDelete = () => {
    const count = select.selectedIds().length;
    if (!confirm(t("bulk.confirmDelete", { count }))) return;
    void bulk(
      async (ids) => {
        await deleteItems(ids);
        select.selectNone();
      },
      (count) => t("a11y.deleted", { count }),
    );
  };

  // Saved on your account, so every list and every device follows it. Wide screens can show a
  // table too, and there the view picked on the list stays on that device (#136).
  const compact = () => listView() === "compact";
  const table = () => listView() === "table";
  const several = () => (items()?.length ?? 0) > 1;
  const onCompact = (on: boolean) =>
    run(async () => {
      await chooseCardView(on ? "compact" : "full", (next) =>
        setProfileCardView(me().profile.id, next),
      );
      me().refetchProfile();
    });

  // In the table, the checkboxes are always there: ticking one starts selecting.
  const tableToggle = (item: Item) => {
    if (!select.selecting()) select.start();
    select.toggle(item.id);
  };
  const tableSelectAll = () => {
    if (!select.selecting()) select.start();
    select.selectAll();
  };

  const itemQuestions = (item: Item, short?: boolean) => (
    <ItemQuestions
      itemName={item.name}
      questions={questions.of(item.id)}
      // Not once it's bought. Nobody buys a "please don't buy" entry, so it stays open.
      canAsk={
        !canEdit() &&
        !item.removed_at &&
        (item.not_wanted || purchases.purchase(item) === "available")
      }
      canAnswer={canEdit()}
      bought={purchases.purchase(item) === "mine" || purchases.purchase(item) === "someone"}
      open={search.questions === item.id}
      onClose={() => closeQuestions(item)}
      busy={questions.busy()}
      error={questions.error()}
      onAsk={(question) => questions.ask(item.id, question)}
      onAnswer={questions.answer}
      short={short}
    />
  );

  // The wishes, and under them the "please don't buy" entries, in the table view.
  const itemTable = (rows: Item[], notWantedRows = false) => (
    <ItemTable
      items={rows}
      canEdit={canEdit()}
      sort={listSections.tableSort()}
      onSort={listSections.sortTable}
      showBought={purchases.showBought()}
      purchase={purchases.purchase}
      boughtFor={(item) => purchases.purchaseOf().get(item.id)?.occasion?.name}
      groupNames={(item) => item.item_groups.map((g) => groupName(g.group_id))}
      occasionChoices={purchases.occasionChoices}
      onBuy={purchases.onBuy}
      onPickOccasion={purchases.buy}
      onCancelPick={purchases.cancelPick}
      onUndo={purchases.onUndo}
      onChangeWant={onChangeWant}
      onRemove={onDelete}
      questions={(item) => itemQuestions(item, true)}
      questionList={(item) => questions.of(item.id)}
      selected={select.selected()}
      onToggleSelect={tableToggle}
      onSelectAll={tableSelectAll}
      onSelectNone={select.selectNone}
      notWanted={notWantedRows}
    />
  );

  const card = (item: Item) => (
    <ItemCard
      data-item-id={item.id}
      item={item}
      compact={compact()}
      purchase={purchases.purchase(item)}
      canEdit={canEdit()}
      groupNames={item.item_groups.map((g) => groupName(g.group_id))}
      boughtFor={purchases.purchaseOf().get(item.id)?.occasion?.name}
      onBuy={() => purchases.onBuy(item)}
      occasionChoices={purchases.occasionChoices(item)}
      onPickOccasion={(occasionId) => purchases.buy(item, occasionId)}
      onCancelPick={purchases.cancelPick}
      onUndo={() => purchases.onUndo(item)}
      delivered={purchases.delivered(item)}
      onDelivered={showDelivery() ? (on) => void purchases.onDelivered(item, on) : undefined}
      onRemove={() => onDelete(item)}
      onChangeWant={() => onChangeWant(item)}
      selecting={select.selecting()}
      selected={select.selected().has(item.id)}
      onToggleSelect={() => select.toggle(item.id)}
      questions={itemQuestions(item)}
    />
  );

  return (
    <>
      <div class={u.row}>
        <div class={styles.title}>
          <Show when={profile()}>
            {(p) => <Avatar id={params.profileId} name={p().display_name} size="lg" />}
          </Show>
          <h1>{title()}</h1>
          <Show when={showMenu()}>
            <ListMenu value={params.profileId} sections={menuSections()} />
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
              justFollowed={follow.justFollowed()}
            />
          </Show>
        </div>
      </div>
      {/* Only the one who drew this person sees it. */}
      <Show when={drawnHere()}>
        {(drawnPerson) => (
          <p>
            <SecretSantaRibbon occasion={drawnPerson().occasion_name} />
          </p>
        )}
      </Show>
      <Show when={nudge.nudgeable()}>
        {(state) => (
          <SecretSantaNudge
            name={profile()?.display_name ?? ""}
            lastNudgedAt={state().last_nudged_at}
            everyDays={NUDGE_EVERY_DAYS}
            now={new Date()}
            busy={nudge.busy()}
            onNudge={nudge.nudge}
          />
        )}
      </Show>
      <Show when={nudge.notice()}>
        <p class={`${u.muted} ${u.small}`}>{nudge.notice()}</p>
      </Show>
      <Show when={profile.error || items.error}>
        <p class={u.error} role="alert">
          {t("wishlist.unavailable")}
        </p>
      </Show>
      <Show when={!ready() && !profile.error && !items.error}>
        <p class={u.muted}>{t("common.loading")}</p>
      </Show>
      <Show when={ready()}>
        <Show when={error()}>
          <p class={u.error} role="alert">
            {error()}
          </p>
        </Show>
        <Show when={canEdit() && cleanupItems().length > 0}>
          <CleanupDialog
            items={cleanupItems()}
            childName={isOwnList() ? undefined : profile()?.display_name}
            busy={cleanupBusy()}
            error={cleanup.error()}
            onDone={(removeIds) => void onCleanUp(removeIds)}
          />
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
        {/* Compact shows from the first item; selecting and sorting only make sense from two. */}
        <Show when={(items()?.length ?? 0) > 0}>
          <div class={u.row}>
            {/* The table has its checkboxes from the start. */}
            <Show when={canEdit() && !select.selecting() && several() && !table()}>
              <Button
                ref={selectButton}
                variant="secondary"
                size="small"
                class={styles.selectButton}
                onClick={startSelecting}
              >
                <span class={u.labelText}>{t("bulk.select")}</span>
                {/* Lucide "list-checks" (ISC licence): stands in for the label on small screens. */}
                <Icon class={u.labelIcon} strokeWidth={1.75}>
                  <path d="m3 17 2 2 4-4" />
                  <path d="m3 7 2 2 4-4" />
                  <path d="M13 6h8" />
                  <path d="M13 12h8" />
                  <path d="M13 18h8" />
                </Icon>
              </Button>
            </Show>
            <Show when={!select.selecting()}>
              <Show
                when={tableFits()}
                fallback={<CompactToggle on={compact()} onChange={(on) => void onCompact(on)} />}
              >
                <ListViewSwitch value={listView()} onChange={chooseListView} />
              </Show>
            </Show>
            {/* The table sorts by its column headers instead. */}
            <Show when={several() && !table()}>
              <ListOrderSelect
                value={listSections.order()}
                showBought={purchases.showBought()}
                showWanted={listSections.hasWantedLevels()}
                onChange={listSections.chooseOrder}
              />
            </Show>
          </div>
        </Show>
        <div ref={cardsRoot} class={styles.cards}>
          <Show
            when={table()}
            fallback={
              <For each={listSections.categories()}>
                {(category) => (
                  <section class={u.stack}>
                    <Show when={isGrouped()}>
                      <h2>{category ?? t("listOrder.uncategorised")}</h2>
                    </Show>
                    <ul
                      class={`${u.list} ${u.cards}`}
                      classList={{ [styles.compactCards]: compact() }}
                    >
                      <For each={itemsIn(category)}>{card}</For>
                    </ul>
                  </section>
                )}
              </For>
            }
          >
            <Show when={listSections.tableItems().length > 0}>
              {itemTable(listSections.tableItems())}
            </Show>
          </Show>
          <Show when={notWanted().length > 0}>
            <section class={u.stack}>
              <h2>{t("listOrder.notWanted")}</h2>
              <Show
                when={table()}
                fallback={
                  <ul
                    class={`${u.list} ${u.cards}`}
                    classList={{ [styles.compactCards]: compact() }}
                  >
                    <For each={notWanted()}>{card}</For>
                  </ul>
                }
              >
                {itemTable(notWanted(), true)}
              </Show>
            </section>
          </Show>
        </div>
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
            onDone={stopSelecting}
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
