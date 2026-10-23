import type { PageInfo } from "./api/pageInfo.ts";

/** The item form fields a page lookup may fill in, as typed text. */
export type PageFillFields = { name: string; price: string; currency: string };

/**
 * A link typed into the item form that is worth looking up: a full http(s) address.
 * Returns it normalised, or null while it's still being typed or isn't a link.
 */
export function lookupUrl(text: string): string | null {
  try {
    const url = new URL(text.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // "https://lego" is still being typed.
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * What a page lookup changes in the item form. The name is only filled when it's still
 * empty; the price only when it's empty or still the one an earlier lookup filled in
 * (`filledPrice`), so nothing typed by hand is ever overwritten.
 */
export function fillFromPage(
  fields: PageFillFields,
  page: PageInfo,
  filledPrice: string | null,
  locale: string,
): Partial<PageFillFields> {
  const changes: Partial<PageFillFields> = {};
  if (page.title && !fields.name.trim()) changes.name = page.title;
  const priceIsOurs = !fields.price.trim() || fields.price === filledPrice;
  if (page.price && priceIsOurs) {
    // Typed the way the language writes it ("12,50" in Dutch), like an item loaded for editing.
    changes.price = page.price.amount.toLocaleString(locale, {
      maximumFractionDigits: 2,
      useGrouping: false,
    });
    changes.currency = page.price.currency;
  }
  return changes;
}
