// Turns the rows of pending_digest() into one email per follower: what was added,
// removed or bought on each list they follow since yesterday's digest.
//
// Netlify functions can't use the app's dictionaries in src/i18n (they hold JSX),
// so the few email texts live here, in the same two languages.
import { escapeHtml, type Email } from "./mail.ts";

export type Change = "added" | "removed" | "bought";

/** One row of pending_digest(): one change, for one follower, on one list. */
export type DigestRow = {
  follower_id: string;
  email: string;
  locale: string;
  list_id: string;
  list_name: string;
  unfollow_token: string;
  change: Change;
  item_name: string;
};

type Texts = {
  subjectOne: (name: string) => string;
  subjectMany: (count: number) => string;
  heading: (name: string) => string;
  change: Record<Change, string>;
  open: string;
  unfollow: string;
  footer: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subjectOne: (name) => `What changed on ${name}'s wishlist`,
    subjectMany: (count) => `What changed on ${count} wishlists you follow`,
    heading: (name) => `${name}'s wishlist`,
    change: { added: "Added", removed: "Removed", bought: "Someone bought" },
    open: "Open the list",
    unfollow: "Stop following",
    footer:
      "You get this email because you follow these lists in Wishlister, until the date you picked or the occasion you bought something for.",
  },
  nl: {
    subjectOne: (name) => `Wat er veranderde op het lijstje van ${name}`,
    subjectMany: (count) => `Wat er veranderde op ${count} lijstjes die je volgt`,
    heading: (name) => `Het lijstje van ${name}`,
    change: { added: "Toegevoegd", removed: "Verwijderd", bought: "Iemand kocht" },
    open: "Lijstje openen",
    unfollow: "Niet meer volgen",
    footer:
      "Je krijgt deze e-mail omdat je deze lijstjes volgt in Wishlister, tot de datum die je koos of de gelegenheid waarvoor je iets kocht.",
  },
};

type ListChanges = {
  id: string;
  name: string;
  unfollowToken: string;
  changes: { change: Change; item: string }[];
};

/**
 * One email per follower, lists and changes in the order the rows come in.
 * `siteUrl` is where the app runs, for the links.
 */
export function buildDigestEmails(rows: DigestRow[], siteUrl: string): Email[] {
  const byFollower = new Map<string, { email: string; locale: string; lists: ListChanges[] }>();
  for (const row of rows) {
    let follower = byFollower.get(row.follower_id);
    if (!follower) {
      follower = { email: row.email, locale: row.locale, lists: [] };
      byFollower.set(row.follower_id, follower);
    }
    let list = follower.lists.find((l) => l.id === row.list_id);
    if (!list) {
      list = {
        id: row.list_id,
        name: row.list_name,
        unfollowToken: row.unfollow_token,
        changes: [],
      };
      follower.lists.push(list);
    }
    list.changes.push({ change: row.change, item: row.item_name });
  }

  const site = siteUrl.replace(/\/$/, "");
  return [...byFollower.values()].map(({ email, locale, lists }) => {
    const t = texts[locale === "nl" ? "nl" : "en"];
    const subject = lists.length === 1 ? t.subjectOne(lists[0].name) : t.subjectMany(lists.length);
    const listUrl = (list: ListChanges) => `${site}/lists/${list.id}`;
    const unfollowUrl = (list: ListChanges) => `${site}/unfollow/${list.unfollowToken}`;

    const html = [
      ...lists.map(
        (list) =>
          `<h2>${escapeHtml(t.heading(list.name))}</h2>` +
          `<ul>${list.changes
            .map((c) => `<li>${t.change[c.change]}: <strong>${escapeHtml(c.item)}</strong></li>`)
            .join("")}</ul>` +
          `<p><a href="${listUrl(list)}">${t.open}</a> · <a href="${unfollowUrl(list)}">${t.unfollow}</a></p>`,
      ),
      `<p style="color:#666;font-size:13px">${t.footer}</p>`,
    ].join("\n");

    const text = [
      ...lists.map((list) =>
        [
          t.heading(list.name),
          ...list.changes.map((c) => `- ${t.change[c.change]}: ${c.item}`),
          `${t.open}: ${listUrl(list)}`,
          `${t.unfollow}: ${unfollowUrl(list)}`,
        ].join("\n"),
      ),
      t.footer,
    ].join("\n\n");

    return { to: email, subject, html, text };
  });
}
