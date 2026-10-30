import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  buildReminder,
  claimReminders,
  releaseReminders,
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

describe("buildReminder", () => {
  it("reminds the giver who they drew, with a link to that list", () => {
    const reminder = buildReminder(row(), "en", "https://wishlister.example/");
    expect(reminder.subject).toBe("🎅 7 days left. The elves are getting nervous.");
    expect(reminder.text).toContain("Christmas is in a week and you're Sara's Secret Santa.");
    expect(reminder.text).toContain("Already wrapped? Then put your feet up.");
    expect(reminder.text).toContain("Open Sara's list: https://wishlister.example/lists/sara-list");
    expect(reminder.html).toContain('href="https://wishlister.example/lists/sara-list"');
    expect(reminder.html).toContain("<strong>Sara</strong>");
  });

  it("counts the days that are really left", () => {
    expect(buildReminder(row({ days_left: 5 }), "en", "https://x").text).toContain(
      "Christmas is in 5 days",
    );
    const tomorrow = buildReminder(row({ days_left: 1 }), "en", "https://x");
    expect(tomorrow.subject).toBe("🎅 1 day left. The elves are getting nervous.");
    expect(tomorrow.text).toContain("Christmas is tomorrow");
  });

  it("writes in the digest's language", () => {
    const reminder = buildReminder(row({ occasion_name: "Kerstmis" }), "nl", "https://x");
    expect(reminder.subject).toBe("🎅 Nog 7 dagen. De elfjes worden zenuwachtig.");
    expect(reminder.text).toContain(
      "Over een week is het Kerstmis en jij bent de Secret Santa van Sara.",
    );
    expect(reminder.text).toContain("Open het lijstje van Sara: https://x/lists/sara-list");
  });

  it("escapes what people typed in the HTML", () => {
    const reminder = buildReminder(
      row({ recipient_name: "<b>Sara</b>", occasion_name: "Xmas & <fun>" }),
      "en",
      "https://x",
    );
    expect(reminder.html).toContain("<strong>&lt;b&gt;Sara&lt;/b&gt;</strong>");
    expect(reminder.html).toContain("Xmas &amp; &lt;fun&gt;");
    expect(reminder.html).not.toContain("<fun>");
  });
});

function fakeAdmin(
  rpc: (name: string, args?: unknown) => Promise<{ data?: unknown; error: unknown }>,
) {
  return { rpc: vi.fn(rpc) } as unknown as SupabaseClient & { rpc: ReturnType<typeof vi.fn> };
}

describe("claimReminders", () => {
  it("only asks for the givers who get a digest", async () => {
    const admin = fakeAdmin(async () => ({ data: [row()], error: null }));
    expect(await claimReminders(admin, ["giver-1", "bert"])).toEqual({ reminders: [row()] });
    expect(admin.rpc).toHaveBeenCalledWith("claim_secret_santa_reminders", {
      givers: ["giver-1", "bert"],
    });
  });

  it("asks nothing without digests", async () => {
    const admin = fakeAdmin(async () => ({ data: [], error: null }));
    expect(await claimReminders(admin, [])).toEqual({ reminders: [] });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("reports when the reminders can't be collected", async () => {
    const admin = fakeAdmin(async () => ({ data: null, error: { message: "boom" } }));
    expect(await claimReminders(admin, ["giver-1"])).toEqual({
      reminders: [],
      error: "Couldn't collect the reminders: boom",
    });
  });
});

describe("releaseReminders", () => {
  it("hands the reminders back for the next digest", async () => {
    const admin = fakeAdmin(async () => ({ data: null, error: null }));
    expect(await releaseReminders(admin, [row()])).toBeUndefined();
    expect(admin.rpc).toHaveBeenCalledWith("release_secret_santa_reminders", {
      draw_ids: ["draw-1"],
      giver_ids: ["giver-1"],
    });
  });
});
