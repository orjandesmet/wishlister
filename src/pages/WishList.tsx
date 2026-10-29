import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { Avatar } from "../components/Avatar.tsx";
import { BulkActions } from "../components/BulkActions.tsx";
import { ListMenu } from "../components/ListMenu.tsx";
import { SecretSantaRibbon } from "../components/SecretSantaRibbon.tsx";
import { FollowList } from "../components/FollowList.tsx";
import { ItemCard } from "../components/ItemCard.tsx";
import { ItemQuestions } from "../components/ItemQuestions.tsx";
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
import { announce, focusHeading, focusSoon, usePageTitle } from "../lib/a11y.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { createActionRunner } from "../lib/createActionRunner.ts";
import { createBulkSelect } from "../lib/createBulkSelect.ts";
import { createFollow } from "../lib/createFollow.ts";
import { createListSections } from "../lib/createListSections.ts";
import { createPurchases } from "../lib/createPurchases.ts";
import { createQuestions } from "../lib/createQuestions.ts";
import { compareNames, formatList, locale, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import { addDays, formatOccasionDate, today, type IsoDate } from "../lib/occasions.ts";
import { useMe } from "../lib/me.tsx";
import { listMenuSections } from "../lib/listMenu.ts";
import { isReady } from "../lib/resource.ts";
import { createCachedResource } from "../lib/cache.ts";
import { loadDrawnPeople, loadItems, loadMyGroups, loadProfileDetails } from "../lib/loaders.ts";
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
  // A menu beside the title opens your own list, your children's, or anyone's from your groups.
  // The groups are an extra: if they fail to load, the menu still has your own lists.
  const [groups] = createCachedResource(() => true, loadMyGroups);
  // The people you drew in a Secret Santa get a ribbon. Another extra: no ribbons if it fails.
  const [drawnPeople] = createCachedResource(() => true, loadDrawnPeople);
  const drawn = () => (drawnPeople.error ? undefined : drawnPeople()) ?? [];
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
      (groups.error ? undefined : groups()) ?? [],
      compareNames,
      drawn().map((d) => d.recipient_profile_id),
    );
  const showMenu = () => menuSections().flatMap((section) => section.options).length > 1;

  const runner = createActionRunner();
  const { error, run } = runner;

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
    const p = profile.error ? undefined : profile();
    return p ? t("wishlist.theirs", { name: p.display_name }) : t("wishlist.fallbackTitle");
  };
  usePageTitle(title);

  // Only loaded once we know it isn't your own list.
  const otherList = () => (profile() && !isOwnList() ? params.profileId : undefined);
  const follow = createFollow(() => params.profileId, otherList, runner);
  // The bell's label changes with it, but out of sight once its popover closes: say it.
  const onFollow = async (until: IsoDate) => {
    await follow.follow(until);
    if (!runner.error()) {
      announce(t("follow.untilDate", { date: formatOccasionDate(until, locale()) }));
    }
  };
  const onUnfollow = async () => {
    await follow.unfollow();
    if (!runner.error()) announce(t("a11y.unfollowed"));
  };
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

  const listSections = createListSections(loadedItems, () =>
    purchases.showBought() ? (item) => purchases.purchaseOf().has(item.id) : undefined,
  );
  const { sections, notWanted, isGrouped } = listSections;
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
        const level = item.wanted_level === 3 ? 1 : ((item.wanted_level + 1) as WantedLevel);
        const was = item.wanted_level;
        const id = item.id;
        const setLevel = (to: WantedLevel) =>
          setItems((prev) =>
            prev?.map((other) => (other.id === id ? { ...other, wanted_level: to } : other)),
          );
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
      onChangeWant={() => onChangeWant(item)}
      selecting={select.selecting()}
      selected={select.selected().has(item.id)}
      onToggleSelect={() => select.toggle(item.id)}
      questions={
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
        />
      }
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
              onFollow={onFollow}
              onUnfollow={onUnfollow}
              justFollowed={justFollowed()}
            />
          </Show>
        </div>
      </div>
      {/* Only the one who drew this person sees it. */}
      <Show when={drawn().find((d) => d.recipient_profile_id === params.profileId)}>
        {(drawnPerson) => (
          <p>
            <SecretSantaRibbon occasion={drawnPerson().occasion_name} />
          </p>
        )}
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
                ref={selectButton}
                variant="secondary"
                size="small"
                class={styles.selectButton}
                onClick={startSelecting}
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
              showWanted={listSections.hasWantedLevels()}
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
