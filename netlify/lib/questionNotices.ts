// Emails about anonymous questions on items (#100): the list's owner (or a child's
// parents) hears about a new question, and the one who asked hears about the
// answer. Never who asked: the database doesn't hand that out.
//
// The link opens the list with the item's questions open, where they can answer.
// See supabase/migrations/20261026160000_item_questions.sql.
//
// Like the digest, the texts live here instead of in src/i18n (which holds JSX).
import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, sendEmails, type Email } from "./mail.ts";

/** One row of claim_question_notices(): one email. */
export type QuestionRow = {
  kind: "question" | "answer";
  question_id: string;
  item_id: string;
  item_name: string;
  list_id: string;
  list_name: string;
  question: string;
  answer: string | null;
  answerer_name: string | null;
  /** A question about the recipient's own list, not their child's. */
  own_list: boolean;
  email: string;
  locale: string;
};

type Texts = {
  questionSubject: (item: string) => string;
  /** `item` and `list` come escaped for the HTML version. */
  asked: (item: string, list: string, ownList: boolean) => string;
  answerSubject: (item: string) => string;
  answered: (item: string, list: string, answerer: string | null) => string;
  question: string;
  answer: string;
  openToAnswer: string;
  open: string;
  questionFooter: string;
  answerFooter: string;
};

const texts: Record<"en" | "nl", Texts> = {
  en: {
    questionSubject: (item) => `Someone has a question about "${item}"`,
    asked: (item, list, ownList) =>
      ownList
        ? `Someone asked a question about ${item} on your wishlist.`
        : `Someone asked a question about ${item} on ${list}'s wishlist.`,
    answerSubject: (item) => `Your question about "${item}" was answered`,
    answered: (item, list, answerer) =>
      `${answerer ?? list} answered your question about ${item} on ${list}'s wishlist.`,
    question: "Question",
    answer: "Answer",
    openToAnswer: "Answer in Wishlister",
    open: "Open the list",
    questionFooter:
      "Questions are anonymous: nobody sees who asked. Your answer shows with your name.",
    answerFooter: "You get this email because you asked this question in Wishlister.",
  },
  nl: {
    questionSubject: (item) => `Iemand heeft een vraag over "${item}"`,
    asked: (item, list, ownList) =>
      ownList
        ? `Iemand heeft een vraag gesteld over ${item} op je verlanglijstje.`
        : `Iemand heeft een vraag gesteld over ${item} op het verlanglijstje van ${list}.`,
    answerSubject: (item) => `Je vraag over "${item}" is beantwoord`,
    answered: (item, list, answerer) =>
      `${answerer ?? list} heeft je vraag over ${item} op het verlanglijstje van ${list} beantwoord.`,
    question: "Vraag",
    answer: "Antwoord",
    openToAnswer: "Antwoorden in Wishlister",
    open: "Lijstje openen",
    questionFooter:
      "Vragen zijn anoniem: niemand ziet wie ze stelde. Je antwoord staat er met je naam bij.",
    answerFooter: "Je krijgt deze e-mail omdat je deze vraag gesteld hebt in Wishlister.",
  },
};

/** The question, or the answer, as a quote. */
function quoteHtml(label: string, text: string) {
  const lines = escapeHtml(text).replaceAll("\n", "<br>");
  return `<p style="margin:0 0 4px;color:#666;font-size:13px">${label}</p><blockquote style="margin:0 0 16px;padding:8px 12px;border-left:3px solid #ccc">${lines}</blockquote>`;
}

/** One email per row. `siteUrl` is where the app runs, for the link. */
export function buildQuestionEmails(rows: QuestionRow[], siteUrl: string): Email[] {
  const site = siteUrl.replace(/\/$/, "");
  return rows.map((row) => {
    const t = texts[row.locale === "nl" ? "nl" : "en"];
    const link = `${site}/lists/${row.list_id}?questions=${row.item_id}`;
    const item = `<strong>${escapeHtml(row.item_name)}</strong>`;
    const list = escapeHtml(row.list_name);

    if (row.kind === "question") {
      return {
        to: row.email,
        subject: t.questionSubject(row.item_name),
        html: [
          `<p>${t.asked(item, list, row.own_list)}</p>`,
          quoteHtml(t.question, row.question),
          `<p><a href="${link}">${t.openToAnswer}</a></p>`,
          `<p style="color:#666;font-size:13px">${t.questionFooter}</p>`,
        ].join("\n"),
        text: [
          t.asked(`"${row.item_name}"`, row.list_name, row.own_list),
          `${t.question}: ${row.question}`,
          `${t.openToAnswer}: ${link}`,
          t.questionFooter,
        ].join("\n\n"),
      };
    }
    const answerer = row.answerer_name ? escapeHtml(row.answerer_name) : null;
    return {
      to: row.email,
      subject: t.answerSubject(row.item_name),
      html: [
        `<p>${t.answered(item, list, answerer)}</p>`,
        quoteHtml(t.question, row.question),
        quoteHtml(t.answer, row.answer ?? ""),
        `<p><a href="${link}">${t.open}</a></p>`,
        `<p style="color:#666;font-size:13px">${t.answerFooter}</p>`,
      ].join("\n"),
      text: [
        t.answered(`"${row.item_name}"`, row.list_name, row.answerer_name),
        `${t.question}: ${row.question}`,
        `${t.answer}: ${row.answer ?? ""}`,
        `${t.open}: ${link}`,
        t.answerFooter,
      ].join("\n\n"),
    };
  });
}

/**
 * Mails everyone who hasn't heard about a new question or answer yet. Claiming
 * the rows marks them as mailed, so two runs at once don't both send; a failed
 * send hands them back for the next run. `admin` is a client with the secret key.
 */
export async function sendQuestionNotices(
  admin: SupabaseClient,
  siteUrl: string,
): Promise<{ sent: number; errors: string[] }> {
  const { data, error } = await admin.rpc("claim_question_notices");
  if (error) return { sent: 0, errors: [`Couldn't collect questions: ${error.message}`] };
  const rows = (data ?? []) as QuestionRow[];
  if (rows.length === 0) return { sent: 0, errors: [] };

  const result = await sendEmails(buildQuestionEmails(rows, siteUrl));
  if (result.errors.length > 0) {
    // Which emails of a failed batch went out isn't known; with fewer than 100
    // (one batch), nothing did.
    const ids = (kind: QuestionRow["kind"]) => [
      ...new Set(rows.filter((row) => row.kind === kind).map((row) => row.question_id)),
    ];
    const { error: releaseError } = await admin.rpc("release_question_notices", {
      question_ids: ids("question"),
      answer_ids: ids("answer"),
    });
    if (releaseError) result.errors.push(`Couldn't release them: ${releaseError.message}`);
  }
  return result;
}
