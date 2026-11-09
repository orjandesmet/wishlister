import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const getUser = vi.fn();
const createClient = vi.fn((..._args: unknown[]) => ({ auth: { getUser } }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

const { noticeHandler, sendAllNotices } = await import("./notices.ts");

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function stubSetup({ mail = true } = {}) {
  vi.stubEnv("VITE_SUPABASE_URL", "https://db.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret");
  vi.stubEnv("NETLIFY_DEV", "");
  vi.stubEnv("RESEND_API_KEY", mail ? "re_key" : "");
  vi.stubEnv("MAIL_FROM", mail ? "Wishlister <hi@example.com>" : "");
}

const post = (headers: Record<string, string> = { Authorization: "Bearer token" }) =>
  new Request("https://wishlister.example/.netlify/functions/notify-x", {
    method: "POST",
    headers,
  });

describe("noticeHandler", () => {
  it("only answers POST", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const send = vi.fn();
    const handler = noticeHandler({ what: "test emails", send });
    const response = await handler(new Request("https://wishlister.example", { method: "GET" }));
    expect(response.status).toBe(405);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing, without failing, when mail isn't set up", async () => {
    stubSetup({ mail: false });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const send = vi.fn();
    const response = await noticeHandler({ what: "test emails", send })(post());
    expect(response.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith("Nothing sent: missing RESEND_API_KEY, MAIL_FROM");
  });

  it("refuses callers who aren't signed in", async () => {
    stubSetup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const send = vi.fn();
    const response = await noticeHandler({ what: "test emails", send })(post({}));
    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends from the request's site and says how many went out", async () => {
    stubSetup();
    getUser.mockResolvedValue({ data: { user: { id: "account-1" } }, error: null });
    const send = vi.fn(async () => ({ sent: 2, errors: [] }));
    const response = await noticeHandler({ what: "test emails", send })(post());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "sent 2" });
    expect(send).toHaveBeenCalledWith(expect.anything(), "https://wishlister.example");
  });

  it("answers 502 with the errors when sending failed", async () => {
    stubSetup();
    getUser.mockResolvedValue({ data: { user: { id: "account-1" } }, error: null });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn(async () => ({ sent: 1, errors: ["a", "b"] }));
    const response = await noticeHandler({ what: "test emails", send })(post());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: "a; b" });
    expect(error).toHaveBeenCalledWith("502 a; b (sending test emails failed, 1 sent)");
  });
});

describe("sendAllNotices", () => {
  it("sends every kind, logging what went out and what failed", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const admin = {} as SupabaseClient;
    const first = vi.fn(async () => ({ sent: 3, errors: [] }));
    const second = vi.fn(async () => ({ sent: 0, errors: ["boom"] }));

    await sendAllNotices(
      [
        { what: "removal notices", send: first },
        { what: "question emails", send: second },
      ],
      admin,
      "https://site.example",
    );

    expect(first).toHaveBeenCalledWith(admin, "https://site.example");
    expect(second).toHaveBeenCalledWith(admin, "https://site.example");
    expect(log).toHaveBeenCalledExactlyOnceWith("Removal notices sent: 3");
    expect(error).toHaveBeenCalledExactlyOnceWith("Sending question emails failed: boom");
  });
});
