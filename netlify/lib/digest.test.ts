import { describe, expect, it } from "vite-plus/test";
import { buildDigestEmails, type DigestRow } from "./digest.ts";

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

  it("escapes names in the HTML", () => {
    const [email] = buildDigestEmails(
      [row({ list_name: "<Anna>", item_name: "Tom & Jerry" })],
      "https://wishlister.example",
    );
    expect(email.html).toContain("&lt;Anna&gt;");
    expect(email.html).toContain("Tom &amp; Jerry");
  });
});
