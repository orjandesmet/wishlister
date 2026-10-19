import { describe, expect, it, vi } from "vite-plus/test";
import { escapeHtml, mailConfigured, sendEmail } from "./mail.ts";

const env = { RESEND_API_KEY: "re_test", MAIL_FROM: "Wishlister <wishlister@example.com>" };
const email = { to: "ann@example.com", subject: "Hi", html: "<p>Hi</p>" };

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => Response.json(body, { status }));
}

describe("sendEmail", () => {
  it("posts the email to Resend with the sender and API key", async () => {
    const fetch = fakeFetch(200, { id: "email_1" });
    expect(await sendEmail(email, env, fetch)).toEqual({ ok: true, id: "email_1" });

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toEqual({ from: env.MAIL_FROM, ...email });
  });

  it("reports Resend's error message", async () => {
    const fetch = fakeFetch(403, { message: "The example.com domain is not verified." });
    expect(await sendEmail(email, env, fetch)).toEqual({
      ok: false,
      error: "The example.com domain is not verified.",
    });
  });

  it("reports a network failure", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("fetch failed");
    });
    expect(await sendEmail(email, env, fetch)).toEqual({ ok: false, error: "fetch failed" });
  });

  it("doesn't call Resend when it isn't set up", async () => {
    const fetch = fakeFetch(200, { id: "email_1" });
    const result = await sendEmail(email, {}, fetch);
    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    expect(mailConfigured({})).toBe(false);
    expect(mailConfigured(env)).toBe(true);
  });
});

describe("escapeHtml", () => {
  it("escapes markup in names", () => {
    expect(escapeHtml(`<b>Tom & "Jerry"</b>`)).toBe(
      "&lt;b&gt;Tom &amp; &quot;Jerry&quot;&lt;/b&gt;",
    );
  });
});
