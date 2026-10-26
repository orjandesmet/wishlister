import { supabase } from "../supabase.ts";
import type { ItemId, QuestionId } from "../ids.ts";
import { must } from "./must.ts";

/**
 * An anonymous question about an item, and its answer (#100). Who asked is never
 * sent: `mine` only tells you whether you asked it yourself.
 */
export type Question = {
  id: QuestionId;
  item_id: ItemId;
  question: string;
  answer: string | null;
  /** Who answered: the list's owner or one of a child's parents. */
  answerer_name: string | null;
  answered_at: string | null;
  created_at: string;
  mine: boolean;
};

/** Questions on the given items, oldest first. */
export async function getQuestions(itemIds: ItemId[]): Promise<Question[]> {
  if (itemIds.length === 0) return [];
  return must(await supabase.rpc("get_item_questions", { item_ids: itemIds })) as Question[];
}

/** Not on your own list, and not once the item is bought: the database refuses. */
export async function askQuestion(itemId: ItemId, question: string) {
  must(await supabase.rpc("ask_question", { target_item: itemId, question }));
  void notify();
}

/** Answers or changes the answer. An empty answer takes it back. */
export async function answerQuestion(questionId: QuestionId, answer: string) {
  must(await supabase.rpc("answer_question", { target_question: questionId, answer }));
  void notify();
}

/**
 * Emails the owner about a new question, or the one who asked about the answer.
 * Runs in a Netlify function because it needs Supabase's secret key. Not waited
 * for: the evening digest run sends whatever this missed.
 */
async function notify() {
  try {
    const { data } = await supabase.auth.getSession();
    await fetch("/.netlify/functions/notify-questions", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    });
  } catch {
    // Offline, or running without Netlify (vp dev): the digest catches up.
  }
}
