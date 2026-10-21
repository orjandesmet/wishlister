/// <reference types="node" />
// Sends app emails that aren't sign-in emails (someone added you to a group, a
// list you follow changed…) through Resend's HTTP API.
//
// Netlify functions import it as "../lib/mail.ts". It lives outside
// netlify/functions/ so Netlify doesn't deploy it as a function of its own.
//
// Needs two environment variables in Netlify:
// - RESEND_API_KEY: a Resend API key with "Sending access".
// - MAIL_FROM: the sender, on the domain verified in Resend, e.g.
//   "Wishlister <wishlister@example.com>".

export type Email = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text version for mail apps that don't show HTML. Resend derives one when left out. */
  text?: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

const RESEND_URL = "https://api.resend.com/emails";
const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
/** Resend takes at most this many emails in one batch call. */
const BATCH_SIZE = 100;

export function mailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

export async function sendEmail(
  email: Email,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!apiKey || !from) {
    return {
      ok: false,
      error: "Sending emails isn't set up yet (missing RESEND_API_KEY or MAIL_FROM).",
    };
  }

  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...email }),
  }).catch((error: unknown) => error as Error);
  if (response instanceof Error) return { ok: false, error: response.message };

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) {
    return { ok: false, error: body.message ?? `Resend answered ${response.status}` };
  }
  return { ok: true, id: body.id };
}

/**
 * Sends many emails in as few calls as possible (Resend's batch API, 100 per
 * call), so a scheduled function doesn't hit Resend's rate limit or its own time
 * limit. A failed call fails all of its emails; its error is in `errors`.
 */
export async function sendEmails(
  emails: Email[],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ sent: number; errors: string[] }> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;
  if (!apiKey || !from) {
    return {
      sent: 0,
      errors: ["Sending emails isn't set up yet (missing RESEND_API_KEY or MAIL_FROM)."],
    };
  }

  let sent = 0;
  const errors: string[] = [];
  for (let start = 0; start < emails.length; start += BATCH_SIZE) {
    const batch = emails.slice(start, start + BATCH_SIZE);
    const response = await fetchImpl(RESEND_BATCH_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((email) => ({ from, ...email }))),
    }).catch((error: unknown) => error as Error);
    if (response instanceof Error) {
      errors.push(response.message);
      continue;
    }
    const body = (await response.json().catch(() => ({}))) as {
      data?: { id: string }[];
      message?: string;
    };
    if (!response.ok || !body.data) {
      errors.push(body.message ?? `Resend answered ${response.status}`);
      continue;
    }
    sent += body.data.length;
  }
  return { sent, errors };
}

/** Makes text safe to drop into an email's HTML (group names, display names…). */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
