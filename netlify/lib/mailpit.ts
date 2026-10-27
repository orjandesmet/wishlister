// Local development only: sends app emails to Mailpit's HTTP API instead of
// Resend. mail.ts loads it only under `netlify dev` when MAILPIT_URL is set.
import type { Email, SendResult } from "./mail.ts";

/** Splits "Name <a@b.c>" or "a@b.c" into Mailpit's { Email, Name }. */
function parseAddress(address: string): { Email: string; Name?: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(address);
  return match ? { Email: match[2], Name: match[1] || undefined } : { Email: address.trim() };
}

/** Local development: hands the email to Mailpit's HTTP API instead of Resend. */
export async function sendToMailpit(
  email: Email,
  baseUrl: string,
  from: string = "Wishlister <wishlister@localhost>",
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const base = baseUrl.replace(/\/+$/, "");
  const recipients = Array.isArray(email.to) ? email.to : [email.to];
  const response = await fetchImpl(`${base}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: parseAddress(from),
      To: recipients.map(parseAddress),
      Subject: email.subject,
      HTML: email.html,
      Text: email.text,
    }),
  }).catch((error: unknown) => error as Error);
  if (response instanceof Error) return { ok: false, error: response.message };

  const body = (await response.json().catch(() => ({}))) as { ID?: string; Error?: string };
  if (!response.ok || !body.ID) {
    return { ok: false, error: body.Error ?? `Mailpit answered ${response.status}` };
  }
  return { ok: true, id: body.ID };
}
