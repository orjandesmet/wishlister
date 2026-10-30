import { describe, expect, it } from "vite-plus/test";
import { buildDigestEmails, type DigestRow } from "./digest.ts";
import type { ReminderRow } from "./secret-santa/secretSantaReminders.ts";

const row = (overrides: Partial<DigestRow>): DigestRow => ({
  follower_id: "bert",
  email: "bert@example.com",
  locale: "en",
  list_id: "anna-list",
  list_name: "Anna",
  unfollow_token: "token-anna",
  change: "added",
  item_name: "LEGO bonsai",
  ...overrides,
});

describe("buildDigestEmails", () => {
  it("sends one email per follower, with each list's changes", () => {
    const emails = buildDigestEmails(
      [
        row({}),
        row({ change: "bought", item_name: "Book" }),
        row({ follower_id: "carl", email: "carl@example.com", change: "removed" }),
      ],
      "https://wishlister.example/",
    );

    expect(emails).toHaveLength(2);
    const [bert, carl] = emails;
    expect(bert.to).toBe("bert@example.com");
    expect(bert.subject).toBe("What changed on Anna's wishlist");
    expect(bert.text).toContain("- Added: LEGO bonsai\n- Someone bought: Book");
    expect(bert.html).toContain('href="https://wishlister.example/lists/anna-list"');
    expect(bert.html).toContain('href="https://wishlister.example/unfollow/token-anna"');
    expect(carl.text).toContain("- Removed: LEGO bonsai");
  });

  it("names the number of lists when there are several", () => {
    const [email] = buildDigestEmails(
      [row({}), row({ list_id: "kid-list", list_name: "Kid", unfollow_token: "token-kid" })],
      "https://wishlister.example",
    );
    expect(email.subject).toBe("What changed on 2 wishlists you follow");
    expect(email.html).toContain("/unfollow/token-kid");
  });

  it("writes in the follower's language", () => {
    const [email] = buildDigestEmails([row({ locale: "nl" })], "https://wishlister.example");
    expect(email.subject).toBe("Wat er veranderde op het lijstje van Anna");
    expect(email.text).toContain("- Toegevoegd: LEGO bonsai");
  });

  it("marks please-don't-buy entries", () => {
    const [email] = buildDigestEmails(
      [row({ item_name: "Mugs", not_wanted: true }), row({ locale: "en" })],
      "https://wishlister.example",
    );
    expect(email.text).toContain("- Added: Mugs (please don't buy)\n- Added: LEGO bonsai\n");
    expect(email.html).toContain("<strong>Mugs</strong> (please don't buy)");
    const [nl] = buildDigestEmails(
      [row({ locale: "nl", change: "removed", item_name: "Mokken", not_wanted: true })],
      "https://wishlister.example",
    );
    expect(nl.text).toContain("- Verwijderd: Mokken (liever niet)");
  });

  it("escapes names in the HTML", () => {
    const [email] = buildDigestEmails(
      [row({ list_name: "<Anna>", item_name: "Tom & Jerry" })],
      "https://wishlister.example",
    );
    expect(email.html).toContain("&lt;Anna&gt;");
    expect(email.html).toContain("Tom &amp; Jerry");
  });

  it("puts a Secret Santa reminder on top of that giver's digest, as the subject", () => {
    const reminder: ReminderRow = {
      secret_santa_id: "draw-1",
      giver_profile_id: "bert",
      recipient_profile_id: "sara-list",
      recipient_name: "Sara",
      occasion_name: "Christmas",
      occasion_date: "2026-12-25",
      days_left: 7,
      email: "bert@example.com",
      locale: "en",
    };
    const [bert, carl] = buildDigestEmails(
      [row({}), row({ follower_id: "carl", email: "carl@example.com" })],
      "https://wishlister.example",
      [reminder],
    );
    expect(bert.subject).toBe("🎅 7 days left. The elves are getting nervous.");
    const text = bert.text ?? "";
    expect(text.indexOf("Sara's Secret Santa")).toBeLessThan(text.indexOf("LEGO bonsai"));
    expect(bert.html).toContain('href="https://wishlister.example/lists/sara-list"');
    expect(carl.subject).toBe("What changed on Anna's wishlist");
    expect(carl.text).not.toContain("Secret Santa");
  });
});
