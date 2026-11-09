// What the app's emails share when they're built: the language they're written in,
// links back to the app, and the small line at the bottom.

/** The languages the emails are written in. */
export type EmailLocale = "en" | "nl";

/** The email language for an account's locale: Dutch for "nl", English for anything else. */
export function emailLocale(locale: unknown): EmailLocale {
  return locale === "nl" ? "nl" : "en";
}

/** An email's texts in the recipient's language. */
export function textsFor<T>(texts: Record<EmailLocale, T>, locale: unknown): T {
  return texts[emailLocale(locale)];
}

/** Where the app runs, without a trailing slash, so a path can follow ("/lists/…"). */
export function siteBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, "");
}

/** The small grey line at the bottom of an email: why you get it. `html` isn't escaped. */
export function footerHtml(html: string): string {
  return `<p style="color:#666;font-size:13px">${html}</p>`;
}
