import { createMemo, createResource, createSignal } from "solid-js";
import type { PurchaseState } from "../components/ItemCard.tsx";
import type { Item } from "./api/items.ts";
import type { Occasion } from "./api/occasions.ts";
import { getPurchaseOccasions, getPurchases, markBought, undoBought } from "./api/purchases.ts";
import type { ActionRunner } from "./createActionRunner.ts";
import type { ItemId, OccasionId, ProfileId } from "./ids.ts";
import { burstMoneyForTap } from "./moneyBurst.ts";

/** Who bought what on a list, and the "I bought this" flow. */
export function createPurchases(
  items: () => Item[] | undefined,
  isOwnList: () => boolean,
  myId: () => ProfileId,
  runner: ActionRunner,
  /** Buying follows the list, so its end date may have moved too. */
  onBought: () => unknown,
) {
  // Runs again whenever the items change. The database leaves out purchases on your own list.
  const [purchases, { refetch: refetchPurchases }] = createResource(
    () => items()?.map((item) => item.id),
    getPurchases,
  );
  const purchaseOf = createMemo(
    () => new Map((purchases() ?? []).map((p) => [p.item_id, p] as const)),
  );
  const purchase = (item: Item): PurchaseState => {
    if (isOwnList() || item.not_wanted || !purchases()) return "hidden";
    const bought = purchaseOf().get(item.id);
    if (bought === undefined) return "available";
    return bought.bought_by === myId() ? "mine" : "someone";
  };
  // Owners never learn what was bought, so "not bought first" only exists on other lists.
  const showBought = () => !isOwnList() && purchases() !== undefined;

  // "I bought this" asks which occasion it's for, unless there's only one (or none).
  const [choosing, setChoosing] = createSignal<{ itemId: ItemId; occasions: Occasion[] }>();
  const buy = (item: Item, occasionId: OccasionId | null) =>
    runner.run(async () => {
      setChoosing(undefined);
      await markBought(item.id, occasionId);
      burstMoneyForTap(item.id, item.price, item.price_currency);
      await Promise.all([refetchPurchases(), onBought()]);
    });
  const onBuy = (item: Item) =>
    runner.run(async () => {
      const occasions = await getPurchaseOccasions(item.id);
      if (occasions.length > 1) setChoosing({ itemId: item.id, occasions });
      else await buy(item, occasions[0]?.id ?? null);
    });
  const occasionChoices = (item: Item) =>
    choosing()?.itemId === item.id ? choosing()?.occasions : undefined;
  const onUndo = (item: Item) =>
    runner.run(() => undoBought(item.id).then(() => void refetchPurchases()));

  return {
    purchaseOf,
    purchase,
    showBought,
    buy,
    onBuy,
    onUndo,
    occasionChoices,
    cancelPick: () => setChoosing(undefined),
  };
}
