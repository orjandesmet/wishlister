// Tells buyers that the list's owner removed something they bought (#89), so
// they can cancel their order while that's still possible.
//
// The owner doesn't know it was bought: the database keeps the item, hidden from
// the owner but still shown as bought to everyone else, until the buyer undoes
// "I bought this". See supabase/migrations/20261025120000_removed_bought_items.sql.
//
// Like the digest, the texts live here instead of in src/i18n (which holds JSX).
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmails, type Email } from "./mail.ts";

/** One row of claim_removal_notices(): one removed item, for its buyer. */
export type RemovalRow = {
  item_id: string;
  item_name: string;
  list_id: string;
  list_name: string;
  occasion_name: string | null;
  email: string;
  locale: string;
};

type Texts = {
  subject: (item: string, list: string) => string;
  /** `item` and `list` come escaped for the HTML version. */
  removed: (item: string, list: string) => string;
  youBought: (occasion: string | null) => string;
  cancel: string;
  keep: string;
  open: string;
  footer: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subject: (item, list) => `${list} removed "${item}" from their wishlist`,
    removed: (item, list) => `${list} removed ${item} from their wishlist.`,
    youBought: (occasion) =>
      `You marked it as bought${occasion ? ` for ${occasion}` : ""}. They don't know that.`,
    cancel:
      'Can you still cancel your order? Then undo "I bought this" in the app, and the item is gone for good.',
    keep: "If you keep it, the others still see it as bought, so nobody buys it twice.",
    open: "Open the list",
    footer: "You get this email because you marked this item as bought in Wishlister.",
  },
  nl: {
    subject: (item, list) => `${list} heeft "${item}" van het lijstje gehaald`,
    removed: (item, list) => `${list} heeft ${item} van het lijstje gehaald.`,
    youBought: (occasion) =>
      `Jij had het gekocht${occasion ? ` voor ${occasion}` : ""}. Dat weten ze niet.`,
    cancel:
      'Kun je je bestelling nog annuleren? Maak dan "Ik heb dit gekocht" ongedaan in de app, dan verdwijnt het voorgoed.',
    keep: "Hou je het, dan zien de anderen het nog als gekocht, zodat niemand het dubbel koopt.",
    open: "Lijstje openen",
    footer: "Je krijgt deze e-mail omdat je dit als gekocht hebt aangeduid in Wishlister.",
  },
};

/** One email per removed item. `siteUrl` is where the app runs, for the link. */
export function buildRemovalEmails(rows: RemovalRow[], siteUrl: string): Email[] {
  const site = siteUrl.replace(/\/$/, "");
  return rows.map((row) => {
    const t = texts[row.locale === "nl" ? "nl" : "en"];
    const listUrl = `${site}/lists/${row.list_id}`;
    const html = [
      `<p>${t.removed(`<strong>${escapeHtml(row.item_name)}</strong>`, escapeHtml(row.list_name))}</p>`,
      `<p>${escapeHtml(t.youBought(row.occasion_name))}</p>`,
      `<p>${escapeHtml(t.cancel)}</p>`,
      `<p>${escapeHtml(t.keep)}</p>`,
      `<p><a href="${listUrl}">${t.open}</a></p>`,
      `<p style="color:#666;font-size:13px">${t.footer}</p>`,
    ].join("\n");
    const text = [
      t.removed(`"${row.item_name}"`, row.list_name),
      t.youBought(row.occasion_name),
      t.cancel,
      t.keep,
      `${t.open}: ${listUrl}`,
      t.footer,
    ].join("\n\n");
    return {
      to: row.email,
      subject: t.subject(row.item_name, row.list_name),
      html,
      text,
    };
  });
}

/**
 * Mails every buyer who hasn't heard yet. Claiming the rows marks them as mailed,
 * so two runs at once don't both send; a failed send hands them back for the next
 * run. `admin` is a client with the secret key.
 */
export async function sendRemovalNotices(
  admin: SupabaseClient,
  siteUrl: string,
): Promise<{ sent: number; errors: string[] }> {
  const { data, error } = await admin.rpc("claim_removal_notices");
  if (error) return { sent: 0, errors: [`Couldn't collect removed items: ${error.message}`] };
  const rows = (data ?? []) as RemovalRow[];
  if (rows.length === 0) return { sent: 0, errors: [] };

  const result = await sendEmails(buildRemovalEmails(rows, siteUrl));
  if (result.errors.length > 0) {
    // Which emails of a failed batch went out isn't known; with fewer than 100
    // (one batch), nothing did.
    const { error: releaseError } = await admin.rpc("release_removal_notices", {
      item_ids: rows.map((row) => row.item_id),
    });
    if (releaseError) result.errors.push(`Couldn't release them: ${releaseError.message}`);
  }
  return result;
}
