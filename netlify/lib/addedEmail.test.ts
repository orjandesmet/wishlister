import { describe, expect, it } from "vite-plus/test";
import { buildAddedEmail } from "./addedEmail.ts";

const base = {
  to: "bert@example.com",
  locale: "en",
  group: "Family",
  addedBy: "Anna",
  groupUrl: "https://wishlister.example/groups/g1",
};

describe("buildAddedEmail", () => {
  it("names the group, who added them, and links to the group", () => {
    const email = buildAddedEmail(base);
    expect(email.to).toBe("bert@example.com");
    expect(email.subject).toBe("You're in Family on Wishlister");
    expect(email.text).toContain("Anna added you to the group Family.");
    expect(email.text).toContain("Open the group: https://wishlister.example/groups/g1");
    expect(email.html).toContain('href="https://wishlister.example/groups/g1"');
  });

  it("writes in the recipient's language", () => {
    const email = buildAddedEmail({ ...base, locale: "nl" });
    expect(email.subject).toBe("Je zit in Family op Wishlister");
    expect(email.text).toContain("Anna heeft je toegevoegd aan de groep Family.");
  });

  it("falls back to English and to 'Someone'", () => {
    const email = buildAddedEmail({ ...base, locale: "fr", addedBy: undefined });
    expect(email.text).toContain("Someone added you to the group Family.");
  });

  it("escapes names in the HTML", () => {
    const email = buildAddedEmail({ ...base, group: "<b>Fam</b>", addedBy: "A & B" });
    expect(email.html).toContain("&lt;b&gt;Fam&lt;/b&gt;");
    expect(email.html).toContain("A &amp; B");
    expect(email.text).toContain("A & B added you to the group <b>Fam</b>.");
  });
});
