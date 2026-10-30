import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  buildSecretSantaEmails,
  sendSecretSantaNotices,
  type SecretSantaRow,
} from "./secretSantaNotices.ts";

const row = (overrides: Partial<SecretSantaRow> = {}): SecretSantaRow => ({
  secret_santa_id: "draw-1",
  giver_profile_id: "giver-1",
  recipient_profile_id: "bob-list",
  recipient_name: "Bob",
  occasion_name: "Christmas",
  occasion_date: "2026-12-25",
  group_name: "Family",
  email: "alice@example.com",
  locale: "en",
  ...overrides,
});

describe("buildSecretSantaEmails", () => {
  it("tells the giver who they drew, with a link to that person's list", () => {
    const [email] = buildSecretSantaEmails([row()], "https://wishlister.example/");
    expect(email.to).toBe("alice@example.com");
    expect(email.subject).toBe("Your Secret Santa for Christmas");
    expect(email.text).toContain("You drew Bob for Christmas (25 December 2026) in Family.");
    expect(email.text).toContain("Open their list: https://wishlister.example/lists/bob-list");
    expect(email.html).toContain('href="https://wishlister.example/lists/bob-list"');
    expect(email.html).toContain("<strong>Bob</strong>");
  });

  it("writes in the recipient's language", () => {
    const [email] = buildSecretSantaEmails([row({ locale: "nl" })], "https://wishlister.example");
    expect(email.subject).toBe("Jouw Secret Santa voor Christmas");
    expect(email.text).toContain("Jij hebt Bob getrokken voor Christmas (25 december 2026)");
    expect(email.text).toContain("Hou het geheim!");
  });

  it("uses English for languages it doesn't know", () => {
    const [email] = buildSecretSantaEmails([row({ locale: "fr" })], "https://wishlister.example");
    expect(email.subject).toBe("Your Secret Santa for Christmas");
  });

  it("makes one email per row, and never mentions anyone else's pair", () => {
    const emails = buildSecretSantaEmails(
      [
        row(),
        row({
          giver_profile_id: "giver-2",
          recipient_profile_id: "carol-list",
          recipient_name: "Carol",
          email: "bob@example.com",
        }),
      ],
      "https://wishlister.example",
    );
    expect(emails.map((email) => email.to)).toEqual(["alice@example.com", "bob@example.com"]);
    expect(emails[0].text).not.toContain("Carol");
    expect(emails[1].text).not.toContain("Bob for");
  });

  it("escapes what people typed in the HTML", () => {
    const [email] = buildSecretSantaEmails(
      [
        row({
          recipient_name: "<b>Bob</b>",
          occasion_name: "Xmas & <fun>",
          group_name: '"Family"',
        }),
      ],
      "https://wishlister.example",
    );
    expect(email.html).toContain("<strong>&lt;b&gt;Bob&lt;/b&gt;</strong>");
    expect(email.html).toContain("Xmas &amp; &lt;fun&gt;");
    expect(email.html).not.toContain("<fun>");
  });

  it("renders the message as HTML above the draw, and as it is in the text", () => {
    const [email] = buildSecretSantaEmails(
      [
        row({
          message:
            "Budget is **20 euro**.\n\n- one\n- [two](https://example.com)\n\n<script>x</script>",
        }),
      ],
      "https://wishlister.example",
    );
    expect(email.html).toContain("<strong>20 euro</strong>");
    expect(email.html).toContain("<li>one</li>");
    expect(email.html).toContain('<li><a href="https://example.com/">two</a></li>');
    expect(email.html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html.indexOf("20 euro")).toBeLessThan(email.html.indexOf("You drew"));
    expect(email.text).toContain("Budget is **20 euro**.");
  });

  it("sends no message block without a message", () => {
    const [email] = buildSecretSantaEmails([row({ message: null })], "https://wishlister.example");
    expect(email.html).not.toContain("<hr>");
    expect(email.text).not.toContain("---");
  });

  it("keeps an unreadable date as it is", () => {
    const [email] = buildSecretSantaEmails(
      [row({ occasion_date: "someday" })],
      "https://wishlister.example",
    );
    expect(email.text).toContain("(someday)");
  });
});

function fakeAdmin(
  rpc: (name: string, args?: unknown) => Promise<{ data?: unknown; error: unknown }>,
) {
  return { rpc: vi.fn(rpc) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("sendSecretSantaNotices", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubResend = (status: number) => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const emails = JSON.parse((init?.body as string | undefined) ?? "[]") as unknown[];
      return Response.json({ data: emails.map((_, id) => ({ id: `id-${id}` })) }, { status });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("MAIL_FROM", "Wishlister <hi@example.com>");
    return fetchMock;
  };

  it("sends nothing when no pair is waiting", async () => {
    const fetchMock = stubResend(200);
    const admin = fakeAdmin(async () => ({ data: [], error: null }));
    expect(await sendSecretSantaNotices(admin, "https://wishlister.example")).toEqual({
      sent: 0,
      errors: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(admin.rpc).toHaveBeenCalledTimes(1);
  });

  it("reports when the pairs can't be collected", async () => {
    const fetchMock = stubResend(200);
    const admin = fakeAdmin(async () => ({ data: null, error: { message: "boom" } }));
    const result = await sendSecretSantaNotices(admin, "https://wishlister.example");
    expect(result.sent).toBe(0);
    expect(result.errors).toEqual(["Couldn't collect Secret Santa pairs: boom"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one email per pair in one batch", async () => {
    const fetchMock = stubResend(200);
    const admin = fakeAdmin(async () => ({
      data: [row(), row({ giver_profile_id: "giver-2", email: "bob@example.com" })],
      error: null,
    }));
    const result = await sendSecretSantaNotices(admin, "https://wishlister.example");
    expect(result).toEqual({ sent: 2, errors: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(JSON.parse(init.body as string)).toHaveLength(2);
    // Nothing to hand back.
    expect(admin.rpc).toHaveBeenCalledTimes(1);
  });

  it("hands the pairs back when sending fails", async () => {
    stubResend(500);
    const admin = fakeAdmin(async (name) =>
      name === "claim_secret_santa_notices"
        ? {
            data: [row(), row({ secret_santa_id: "draw-2", giver_profile_id: "giver-2" })],
            error: null,
          }
        : { data: null, error: null },
    );
    const result = await sendSecretSantaNotices(admin, "https://wishlister.example");
    expect(result.sent).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(admin.rpc).toHaveBeenCalledWith("release_secret_santa_notices", {
      draw_ids: ["draw-1", "draw-2"],
      giver_ids: ["giver-1", "giver-2"],
    });
  });

  it("says so when handing the pairs back fails too", async () => {
    stubResend(500);
    const admin = fakeAdmin(async (name) =>
      name === "claim_secret_santa_notices"
        ? { data: [row()], error: null }
        : { data: null, error: { message: "locked" } },
    );
    const result = await sendSecretSantaNotices(admin, "https://wishlister.example");
    expect(result.errors.at(-1)).toBe("Couldn't release them: locked");
  });
});
