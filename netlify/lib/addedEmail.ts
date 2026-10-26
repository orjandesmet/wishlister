// The email someone with an account gets when a group manager adds them to a
// group (#30). People without an account get Supabase's "Invite user" email
// instead (send-invite).
//
// Netlify functions can't use the app's dictionaries in src/i18n (they hold JSX),
// so the texts live here, in the same two languages.
import { escapeHtml, type Email } from "./mail.ts";

export type AddedEmail = {
  to: string;
  /** The recipient's language, from their account. */
  locale: string;
  group: string;
  /** Display name of the manager who added them. Missing when unknown. */
  addedBy?: string;
  /** Where the group opens in the app. */
  groupUrl: string;
};

type Texts = {
  subject: (group: string) => string;
  intro: (by: string, group: string) => string;
  someone: string;
  body: string;
  open: string;
  footer: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    subject: (group) => `You're in ${group} on Wishlister`,
    intro: (by, group) => `${by} added you to the group ${group}.`,
    someone: "Someone",
    body: "You can see everyone's wishlists in the group now, and they can see yours.",
    open: "Open the group",
    footer:
      "You get this email because a manager of this group added your account to it in Wishlister.",
  },
  nl: {
    subject: (group) => `Je zit in ${group} op Wishlister`,
    intro: (by, group) => `${by} heeft je toegevoegd aan de groep ${group}.`,
    someone: "Iemand",
    body: "Je ziet nu de lijstjes van iedereen in de groep, en zij zien het jouwe.",
    open: "Groep openen",
    footer:
      "Je krijgt deze e-mail omdat een beheerder van deze groep je account eraan toevoegde in Wishlister.",
  },
};

export function buildAddedEmail({ to, locale, group, addedBy, groupUrl }: AddedEmail): Email {
  const t = texts[locale === "nl" ? "nl" : "en"];
  const by = addedBy?.trim() || t.someone;
  const html = [
    `<p>${t.intro(`<strong>${escapeHtml(by)}</strong>`, `<strong>${escapeHtml(group)}</strong>`)}</p>`,
    `<p>${t.body}</p>`,
    `<p><a href="${escapeHtml(groupUrl)}">${t.open}</a></p>`,
    `<p style="color:#666;font-size:13px">${t.footer}</p>`,
  ].join("\n");
  const text = [t.intro(by, group), t.body, `${t.open}: ${groupUrl}`, t.footer].join("\n\n");
  return { to, subject: t.subject(group), html, text };
}
