import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  buildReminderEmails,
  sendSecretSantaReminders,
  type ReminderRow,
} from "./secretSantaReminders.ts";

const row = (overrides: Partial<ReminderRow> = {}): ReminderRow => ({
  secret_santa_id: "draw-1",
  giver_profile_id: "giver-1",
  recipient_profile_id: "sara-list",
  recipient_name: "Sara",
  occasion_name: "Christmas",
  occasion_date: "2026-12-25",
  days_left: 7,
  email: "alice@example.com",
  locale: "en",
  ...overrides,
});

describe("buildReminderEmails", () => {
  it("reminds the giver who they drew, with a link to that list", () => {
    const [email] = buildReminderEmails([row()], "https://wishlister.example/");
    expect(email.to).toBe("alice@example.com");
    expect(email.subject).toBe("🎅 7 days left. The elves are getting nervous.");
    expect(email.text).toContain("Christmas is in a week and you're Sara's Secret Santa.");
    expect(email.text).toContain("Already wrapped? Then put your feet up.");
    expect(email.text).toContain("Open Sara's list: https://wishlister.example/lists/sara-list");
    expect(email.html).toContain('href="https://wishlister.example/lists/sara-list"');
    expect(email.html).toContain("<strong>Sara</strong>");
  });

  it("counts the days that are really left", () => {
    expect(buildReminderEmails([row({ days_left: 5 })], "https://x")[0].text).toContain(
      "Christmas is in 5 days",
    );
    const [tomorrow] = buildReminderEmails([row({ days_left: 1 })], "https://x");
    expect(tomorrow.subject).toBe("🎅 1 day left. The elves are getting nervous.");
    expect(tomorrow.text).toContain("Christmas is tomorrow");
  });

  it("writes in the giver's language", () => {
    const [email] = buildReminderEmails(
      [row({ locale: "nl", occasion_name: "Kerstmis" })],
      "https://x",
    );
    expect(email.subject).toBe("🎅 Nog 7 dagen. De elfjes worden zenuwachtig.");
    expect(email.text).toContain(
      "Over een week is het Kerstmis en jij bent de Secret Santa van Sara.",
    );
    expect(email.text).toContain("Open het lijstje van Sara: https://x/lists/sara-list");
  });

  it("escapes what people typed in the HTML", () => {
    const [email] = buildReminderEmails(
      [row({ recipient_name: "<b>Sara</b>", occasion_name: "Xmas & <fun>" })],
      "https://x",
    );
    expect(email.html).toContain("<strong>&lt;b&gt;Sara&lt;/b&gt;</strong>");
    expect(email.html).toContain("Xmas &amp; &lt;fun&gt;");
    expect(email.html).not.toContain("<fun>");
  });
});

function fakeAdmin(
  rpc: (name: string, args?: unknown) => Promise<{ data?: unknown; error: unknown }>,
) {
  return { rpc: vi.fn(rpc) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("sendSecretSantaReminders", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

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

  it("sends nothing when no reminder is due", async () => {
    const fetchMock = stubResend(200);
    const admin = fakeAdmin(async () => ({ data: [], error: null }));
    expect(await sendSecretSantaReminders(admin, "https://x")).toEqual({ sent: 0, errors: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the due reminders", async () => {
    const fetchMock = stubResend(200);
    const admin = fakeAdmin(async () => ({
      data: [row(), row({ giver_profile_id: "g2" })],
      error: null,
    }));
    expect(await sendSecretSantaReminders(admin, "https://x")).toEqual({ sent: 2, errors: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(admin.rpc).toHaveBeenCalledTimes(1);
  });

  it("hands the reminders back when sending fails", async () => {
    stubResend(500);
    const admin = fakeAdmin(async () => ({ data: [row()], error: null }));
    const result = await sendSecretSantaReminders(admin, "https://x");
    expect(result.sent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(admin.rpc).toHaveBeenLastCalledWith("release_secret_santa_reminders", {
      draw_ids: ["draw-1"],
      giver_ids: ["giver-1"],
    });
  });

  it("reports when the reminders can't be collected", async () => {
    const admin = fakeAdmin(async () => ({ data: null, error: { message: "boom" } }));
    expect(await sendSecretSantaReminders(admin, "https://x")).toEqual({
      sent: 0,
      errors: ["Couldn't collect the reminders: boom"],
    });
  });
});
