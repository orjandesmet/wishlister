import { createMemo } from "solid-js";
import { announce } from "./a11y.ts";
import type { Item } from "./api/items.ts";
import { answerQuestion, askQuestion, type Question } from "./api/questions.ts";
import { createCachedResource } from "./cache.ts";
import { createActionRunner } from "./createActionRunner.ts";
import { t } from "./i18n.ts";
import type { ItemId, QuestionId } from "./ids.ts";
import { loadQuestions } from "./loaders.ts";

const NONE: Question[] = [];

/**
 * The anonymous questions on a list's items (#100), and asking and answering them.
 * Has its own error and busy flag: they show in the questions dialog, which covers
 * the page's own.
 */
export function createQuestions(items: () => Item[] | undefined) {
  // Runs again whenever the items change. A failure only means no questions show.
  const [questions, { refetch }] = createCachedResource(
    () => items()?.map((item) => item.id),
    loadQuestions,
  );
  const byItem = createMemo(() => {
    const map = new Map<ItemId, Question[]>();
    for (const question of (questions.error ? undefined : questions()) ?? []) {
      map.set(question.item_id, [...(map.get(question.item_id) ?? []), question]);
    }
    return map;
  });
  const runner = createActionRunner();
  const [busy, runBusy] = runner.busyRunner();

  /** Resolves to whether it worked, so the form keeps what was typed when it didn't. */
  const save = async (action: () => Promise<unknown>, done: string) => {
    let ok = false;
    await runBusy(async () => {
      await action();
      await refetch();
      announce(done);
      ok = true;
    });
    return ok;
  };

  return {
    of: (itemId: ItemId) => byItem().get(itemId) ?? NONE,
    busy,
    error: runner.error,
    clearError: () => runner.setError(undefined),
    ask: (itemId: ItemId, question: string) =>
      save(() => askQuestion(itemId, question), t("a11y.asked")),
    answer: (id: QuestionId, answer: string) =>
      save(() => answerQuestion(id, answer), t("a11y.answered")),
  };
}
