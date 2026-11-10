import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { MyPurchase } from "../lib/api/purchases.ts";
import type { ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import { MyPurchases } from "./MyPurchases.tsx";

const christmas = { id: "xmas" as OccasionId, name: "Christmas 2026", date: "2026-12-25" };
const sinterklaas = { id: "sint" as OccasionId, name: "Sinterklaas", date: "2026-12-06" };
const lastYear = { id: "old" as OccasionId, name: "Christmas 2025", date: "2025-12-25" };

const purchase = (
  n: number,
  name: string,
  list: string,
  occasion: MyPurchase["occasion"],
  extra: Partial<MyPurchase> = {},
): MyPurchase => ({
  itemId: `item-${n}` as ItemId,
  name,
  url: null,
  price: null,
  priceCurrency: null,
  listId: list.toLowerCase() as ProfileId,
  listName: list,
  removed: false,
  occasion,
  delivered: false,
  ...extra,
});

const meta = {
  title: "Settings/MyPurchases",
  component: MyPurchases,
  args: {
    today: "2026-11-09",
    onDelivered: fn(),
    showOnCards: false,
    onShowOnCards: fn(),
    purchases: [
      purchase(1, "Cast iron pan", "Anna", christmas, { price: 62.5, priceCurrency: "EUR" }),
      purchase(2, "Merino scarf, grey", "Anna", christmas, { delivered: true }),
      purchase(3, "LEGO train set", "Lucas", sinterklaas, { price: 89.99, priceCurrency: "EUR" }),
      purchase(4, "Pour-over coffee set", "Bert", christmas, { removed: true }),
      purchase(5, "Board game", "Eva", null, { price: 30, priceCurrency: "GBP" }),
      purchase(6, "Old present", "Anna", lastYear),
    ],
  },
} satisfies Meta<typeof MyPurchases>;
export default meta;

type Story = StoryObj<typeof meta>;

/** Sinterklaas first, then Christmas, then what wasn't for an occasion; last year's is left out. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Old present")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("checkbox", { name: /Cast iron pan/ }));
    await expect(args.onDelivered).toHaveBeenCalledWith("item-1", true);
  },
};

/** The checkbox that adds the Delivered tick to the item cards on the lists. */
export const ShowOnCards: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: /Show delivery status/ }));
    await expect(args.onShowOnCards).toHaveBeenCalledWith(true);
  },
};

export const Empty: Story = { args: { purchases: [] } };
