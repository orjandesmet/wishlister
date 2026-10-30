import { describe, expect, it } from "vite-plus/test";
import { buildNudgeEmail, type NudgeRow } from "./secretSantaNudge.ts";

const row = (overrides: Partial<NudgeRow> = {}): NudgeRow => ({
  secret_santa_id: "draw-1",
  previous_nudged_at: null,
  recipient_profile_id: "sara-list",
  occasion_name: "Christmas",
  occasion_date: "2026-12-25",
  email: "sara@example.com",
  locale: "en",
  ...overrides,
});

describe("buildNudgeEmail", () => {
  it("asks the drawn person for ideas, with a link to their own list", () => {
    const email = buildNudgeEmail(row(), "https://wishlister.example/");
    expect(email.to).toBe("sara@example.com");
    expect(email.subject).toBe("Your Secret Santa would love some ideas");
    expect(email.text).toContain(
      "Your Secret Santa for Christmas (25 December 2026) would love some ideas.",
    );
    expect(email.text).toContain("Open your list: https://wishlister.example/lists/sara-list");
    expect(email.html).toContain('href="https://wishlister.example/lists/sara-list"');
  });

  it("writes in the recipient's language", () => {
    const email = buildNudgeEmail(row({ locale: "nl" }), "https://x");
    expect(email.subject).toBe("Je Secret Santa kan wel wat ideeën gebruiken");
    expect(email.text).toContain("Je Secret Santa voor Christmas (25 december 2026)");
    expect(email.text).toContain("Open je lijstje: https://x/lists/sara-list");
  });

  it("escapes the occasion in the HTML", () => {
    const email = buildNudgeEmail(row({ occasion_name: "Xmas & <fun>" }), "https://x");
    expect(email.html).toContain("Xmas &amp; &lt;fun&gt;");
    expect(email.html).not.toContain("<fun>");
  });
});
