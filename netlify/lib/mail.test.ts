import { describe, expect, it, vi } from "vite-plus/test";
import { escapeHtml, mailConfigured, sendEmail, sendEmails } from "./mail.ts";

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

describe("sendEmails", () => {
  it("sends up to 100 emails per batch call", async () => {
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const batch = JSON.parse(init?.body as string) as unknown[];
      return Response.json({ data: batch.map((_, i) => ({ id: `email_${i}` })) });
    });
    const emails = Array.from({ length: 150 }, () => email);
    expect(await sendEmails(emails, env, fetch)).toEqual({ sent: 150, errors: [] });

    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const first = JSON.parse(init?.body as string) as unknown[];
    expect(first).toHaveLength(100);
    expect(first[0]).toEqual({ from: env.MAIL_FROM, ...email });
  });

  it("reports a failed batch and carries on", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ message: "Too many requests" }, { status: 429 }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: "email_1" }] }));
    const emails = Array.from({ length: 101 }, () => email);
    expect(await sendEmails(emails, env, fetch)).toEqual({
      sent: 1,
      errors: ["Too many requests"],
    });
  });

  it("doesn't call Resend when it isn't set up", async () => {
    const fetch = vi.fn();
    const result = await sendEmails([email], {}, fetch);
    expect(result.sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("escapeHtml", () => {
  it("escapes markup in names", () => {
    expect(escapeHtml(`<b>Tom & "Jerry"</b>`)).toBe(
      "&lt;b&gt;Tom &amp; &quot;Jerry&quot;&lt;/b&gt;",
    );
  });
});

describe("Mailpit (local development)", () => {
  const local = { NETLIFY_DEV: "true", MAILPIT_URL: "http://127.0.0.1:54324/" };

  it("sends to Mailpit under netlify dev", async () => {
    const fetch = fakeFetch(200, { ID: "m1" });
    expect(await sendEmail(email, local, fetch)).toEqual({ ok: true, id: "m1" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:54324/api/v1/send");
    expect(JSON.parse(init.body as string).To).toEqual([{ Email: "ann@example.com" }]);
  });

  it("ignores MAILPIT_URL outside netlify dev", async () => {
    const fetch = fakeFetch(200, { id: "email_1" });
    const prod = { ...env, MAILPIT_URL: local.MAILPIT_URL };
    await sendEmail(email, prod, fetch);
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://api.resend.com/emails");
    expect(mailConfigured({ MAILPIT_URL: local.MAILPIT_URL })).toBe(false);
  });

  it("sends each email of a batch", async () => {
    const fetch = fakeFetch(200, { ID: "m1" });
    expect(await sendEmails([email, email], local, fetch)).toEqual({ sent: 2, errors: [] });
  });
});
