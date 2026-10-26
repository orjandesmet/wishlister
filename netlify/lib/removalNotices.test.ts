import { describe, expect, it } from "vite-plus/test";
import { buildRemovalEmails, type RemovalRow } from "./removalNotices.ts";

const row = (overrides: Partial<RemovalRow>): RemovalRow => ({
  item_id: "item-1",
  item_name: "LEGO bonsai",
  list_id: "anna-list",
  list_name: "Anna",
  occasion_name: null,
  email: "bert@example.com",
  locale: "en",
  ...overrides,
});

describe("buildRemovalEmails", () => {
  it("tells the buyer what was removed and how to undo their purchase", () => {
    const [email] = buildRemovalEmails([row({})], "https://wishlister.example/");
    expect(email.to).toBe("bert@example.com");
    expect(email.subject).toBe('Anna removed "LEGO bonsai" from their wishlist');
    expect(email.text).toContain('Anna removed "LEGO bonsai" from their wishlist.');
    expect(email.text).toContain("You marked it as bought. They don't know that.");
    expect(email.text).toContain('undo "I bought this"');
    expect(email.html).toContain("Anna removed <strong>LEGO bonsai</strong>");
    expect(email.html).toContain('href="https://wishlister.example/lists/anna-list"');
  });

  it("names the occasion it was bought for", () => {
    const [email] = buildRemovalEmails(
      [row({ occasion_name: "Christmas" })],
      "https://wishlister.example",
    );
    expect(email.text).toContain("You marked it as bought for Christmas.");
  });

  it("writes in the buyer's language", () => {
    const [email] = buildRemovalEmails(
      [row({ locale: "nl", occasion_name: "Kerst" })],
      "https://wishlister.example",
    );
    expect(email.subject).toBe('Anna heeft "LEGO bonsai" van het lijstje gehaald');
    expect(email.text).toContain("Jij had het gekocht voor Kerst.");
  });

  it("escapes names in the HTML", () => {
    const [email] = buildRemovalEmails(
      [row({ item_name: "<b>Mug</b>", list_name: "Tom & Jo" })],
      "https://wishlister.example",
    );
    expect(email.html).toContain("Tom &amp; Jo removed <strong>&lt;b&gt;Mug&lt;/b&gt;</strong>");
    expect(email.text).toContain('Tom & Jo removed "<b>Mug</b>"');
  });
});
