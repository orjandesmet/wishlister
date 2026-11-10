import type { MyPurchase } from "./api/purchases.ts";
import type { OccasionId, ProfileId } from "./ids.ts";
import type { IsoDate } from "./occasions.ts";

/** The purchases for one person in one occasion section. */
export type PurchasePerson = { listId: ProfileId; name: string; purchases: MyPurchase[] };

/** One section of the overview: an occasion (null: bought for no occasion) and the people in it. */
export type PurchaseSection = {
  occasion: { id: OccasionId; name: string; date: IsoDate } | null;
  people: PurchasePerson[];
};

/**
 * Sorts my purchases into the overview: by occasion first, soonest first, with the
 * ones not bought for an occasion last; inside each, by person, then by item name.
 * Purchases for past occasions are left out.
 */
export function purchaseSections(
  purchases: MyPurchase[],
  today: IsoDate,
  compare: (a: string, b: string) => number,
): PurchaseSection[] {
  const sections = new Map<OccasionId | null, PurchaseSection>();
  for (const purchase of purchases) {
    if (purchase.occasion && purchase.occasion.date < today) continue;
    const key = purchase.occasion?.id ?? null;
    let section = sections.get(key);
    if (!section) {
      section = { occasion: purchase.occasion, people: [] };
      sections.set(key, section);
    }
    let person = section.people.find((p) => p.listId === purchase.listId);
    if (!person) {
      person = { listId: purchase.listId, name: purchase.listName, purchases: [] };
      section.people.push(person);
    }
    person.purchases.push(purchase);
  }

  const sorted = [...sections.values()].sort((a, b) => {
    if (!a.occasion) return b.occasion ? 1 : 0;
    if (!b.occasion) return -1;
    if (a.occasion.date !== b.occasion.date) return a.occasion.date < b.occasion.date ? -1 : 1;
    return compare(a.occasion.name, b.occasion.name);
  });
  for (const section of sorted) {
    section.people.sort((a, b) => compare(a.name, b.name));
    for (const person of section.people) {
      person.purchases.sort((a, b) => compare(a.name, b.name));
    }
  }
  return sorted;
}
