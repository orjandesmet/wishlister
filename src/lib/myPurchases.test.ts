import { describe, expect, it } from "vite-plus/test";
import type { MyPurchase } from "./api/purchases.ts";
import type { ItemId, OccasionId, ProfileId } from "./ids.ts";
import { purchaseSections } from "./myPurchases.ts";

const compare = (a: string, b: string) => a.localeCompare(b, "en");

const christmas = { id: "xmas" as OccasionId, name: "Christmas", date: "2026-12-25" };
const sinterklaas = { id: "sint" as OccasionId, name: "Sinterklaas", date: "2026-12-06" };
const boxingDay = { id: "boxing" as OccasionId, name: "Boxing day", date: "2026-12-25" };
const lastYear = { id: "old" as OccasionId, name: "Christmas 2025", date: "2025-12-25" };

const purchase = (
  name: string,
  listName: string,
  occasion: MyPurchase["occasion"],
  extra: Partial<MyPurchase> = {},
): MyPurchase => ({
  itemId: `item-${name}` as ItemId,
  name,
  url: null,
  price: null,
  priceCurrency: null,
  listId: listName.toLowerCase() as ProfileId,
  listName,
  removed: false,
  occasion,
  delivered: false,
  ...extra,
});

describe("purchaseSections", () => {
  it("groups by occasion, soonest first, with no occasion last", () => {
    const sections = purchaseSections(
      [
        purchase("Scarf", "Anna", null),
        purchase("Pan", "Anna", christmas),
        purchase("Book", "Bert", sinterklaas),
        purchase("Socks", "Bert", boxingDay),
      ],
      "2026-11-09",
      compare,
    );
    expect(sections.map((s) => s.occasion?.name ?? null)).toEqual([
      "Sinterklaas",
      "Boxing day",
      "Christmas",
      null,
    ]);
  });

  it("leaves out past occasions, but keeps today's", () => {
    const sections = purchaseSections(
      [purchase("Old", "Anna", lastYear), purchase("Pan", "Anna", christmas)],
      "2026-12-25",
      compare,
    );
    expect(sections.map((s) => s.occasion?.id)).toEqual(["xmas"]);
  });

  it("groups by person inside an occasion, people and items by name", () => {
    const [section] = purchaseSections(
      [
        purchase("Pan", "Bert", christmas),
        purchase("Train", "Anna", christmas),
        purchase("Book", "Anna", christmas),
      ],
      "2026-11-09",
      compare,
    );
    expect(section.people.map((p) => [p.name, p.purchases.map((i) => i.name)])).toEqual([
      ["Anna", ["Book", "Train"]],
      ["Bert", ["Pan"]],
    ]);
  });

  it("returns nothing without purchases", () => {
    expect(purchaseSections([], "2026-11-09", compare)).toEqual([]);
  });
});
