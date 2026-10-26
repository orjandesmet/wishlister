import { createEffect, createSignal, createUniqueId, For, Show } from "solid-js";
import type { Question } from "../lib/api/questions.ts";
import { t } from "../lib/i18n.ts";
import type { QuestionId } from "../lib/ids.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import styles from "./ItemQuestions.module.css";

/** As long as the database allows. */
const MAX_QUESTION = 500;
const MAX_ANSWER = 1000;

export type ItemQuestionsProps = {
  /** The item's name: in the button's label and the dialog's title. */
  itemName: string;
  /** This item's questions, oldest first. */
  questions: Question[];
  /** Someone else's list and not bought yet: shows the question form. */
  canAsk: boolean;
  /** Your own list, or a child's list you manage: answer and change answers. */
  canAnswer: boolean;
  /** Bought already, so nobody can ask anything new. Says so to the others. */
  bought: boolean;
  /** Opens the dialog, as when following the link in an email. */
  open?: boolean;
  onClose?: () => void;
  busy: boolean;
  /** What went wrong saving, shown in the dialog (the page's own message is behind it). */
  error?: string;
  /** Resolves once saved; the forms only empty then, so nothing typed gets lost. */
  onAsk: (question: string) => Promise<boolean>;
  onAnswer: (id: QuestionId, answer: string) => Promise<boolean>;
};

/** One question, its answer, and for the list's editors a way to answer it. */
function QuestionEntry(props: {
  question: Question;
  canAnswer: boolean;
  busy: boolean;
  onAnswer: (answer: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const answerId = createUniqueId();
  const showForm = () => props.canAnswer && (editing() || !props.question.answer);
  // oxlint-disable-next-line no-unassigned-vars
  let field: HTMLTextAreaElement | undefined;
  // oxlint-disable-next-line no-unassigned-vars
  let editButton: HTMLButtonElement | undefined;

  const startEditing = () => {
    setDraft(props.question.answer ?? "");
    setEditing(true);
    queueMicrotask(() => field?.focus());
  };
  const stopEditing = () => {
    setEditing(false);
    queueMicrotask(() => editButton?.focus());
  };
  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    const wasEditing = editing();
    if (!(await props.onAnswer(draft()))) return;
    setDraft("");
    if (wasEditing) stopEditing();
  };

  return (
    <li class={styles.entry}>
      <p class={styles.question}>
        <span class={u.visuallyHidden}>{t("questions.questionLabel")}: </span>
        {props.question.question}
      </p>
      <Show when={props.question.mine}>
        <p class={`${u.muted} ${u.small}`}>{t("questions.yours")}</p>
      </Show>
      <Show
        when={!showForm()}
        fallback={
          <form class={styles.answerForm} onSubmit={save}>
            <label class={styles.label} for={answerId}>
              {props.question.answer ? t("questions.editAnswer") : t("questions.yourAnswer")}
            </label>
            <textarea
              ref={field}
              id={answerId}
              rows={2}
              maxLength={MAX_ANSWER}
              required={!props.question.answer}
              value={draft()}
              onInput={(event) => setDraft(event.currentTarget.value)}
            />
            <div class={u.row}>
              <Button type="submit" size="small" disabled={props.busy}>
                {t("questions.saveAnswer")}
              </Button>
              <Show when={editing()}>
                <Button variant="link" size="small" onClick={stopEditing}>
                  {t("common.cancel")}
                </Button>
              </Show>
            </div>
          </form>
        }
      >
        <Show
          when={props.question.answer}
          fallback={<p class={`${u.muted} ${u.small}`}>{t("questions.notAnswered")}</p>}
        >
          {(answer) => (
            <div class={styles.answer}>
              <p class={styles.answerBy}>
                {props.question.answerer_name
                  ? t("questions.answerFrom", { name: props.question.answerer_name })
                  : t("questions.answerLabel")}
              </p>
              <p class={styles.answerText}>{answer()}</p>
              <Show when={props.canAnswer}>
                <Button
                  ref={editButton}
                  variant="link"
                  class={styles.change}
                  onClick={startEditing}
                >
                  {t("questions.change")}
                  <span class={u.visuallyHidden}>: {props.question.question}</span>
                </Button>
              </Show>
            </div>
          )}
        </Show>
      </Show>
    </li>
  );
}

/**
 * The "Ask a question" or "2 questions" button on an item, and the dialog it opens
 * with the item's questions and answers. Questions are anonymous; answers show who
 * gave them. Escape, the close button or tapping outside closes the dialog, and
 * focus goes back to the button. Shows nothing when there are no questions and you
 * can't ask any.
 */
export function ItemQuestions(props: ItemQuestionsProps) {
  const titleId = createUniqueId();
  const askId = createUniqueId();
  const askHint = createUniqueId();
  const [draft, setDraft] = createSignal("");
  // oxlint-disable-next-line no-unassigned-vars
  let dialog: HTMLDialogElement | undefined;

  const count = () => props.questions.length;
  const unanswered = () => props.questions.filter((q) => !q.answer).length;
  const visible = () => count() > 0 || props.canAsk;
  const label = () => {
    if (count() === 0) return t("questions.ask");
    if (props.canAnswer && unanswered() > 0) {
      return t("questions.countToAnswer", { count: count(), open: unanswered() });
    }
    return t("questions.count", { count: count() });
  };

  // After the render that puts the dialog in the page: a dialog can't open before that.
  createEffect(() => {
    if (!props.open || !visible()) return;
    queueMicrotask(() => {
      if (dialog?.isConnected && !dialog.open) dialog.showModal();
    });
  });

  const ask = async (event: SubmitEvent) => {
    event.preventDefault();
    if (draft().trim() === "") return;
    if (await props.onAsk(draft().trim())) setDraft("");
  };

  return (
    <Show when={visible()}>
      <Button
        variant="link"
        class={styles.open}
        classList={{ [styles.attention]: props.canAnswer && unanswered() > 0 }}
        aria-haspopup="dialog"
        onClick={() => dialog?.showModal()}
      >
        {/* Lucide "message-circle-question" (ISC licence). */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        {label()}
        <span class={u.visuallyHidden}>: {props.itemName}</span>
      </Button>
      <dialog
        ref={dialog}
        class={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => props.onClose?.()}
        // The dialog itself has no padding, so only a tap on the backdrop lands on it.
        onClick={(event) => event.target === event.currentTarget && dialog?.close()}
      >
        <div class={styles.body}>
          <div class={styles.head}>
            <h2 id={titleId} class={styles.title}>
              {t("questions.title", { name: props.itemName })}
            </h2>
            <Button
              variant="link"
              size="small"
              class={styles.close}
              aria-label={t("common.close")}
              onClick={() => dialog?.close()}
            >
              ×
            </Button>
          </div>
          <p class={`${u.muted} ${u.small}`}>
            {props.canAnswer ? t("questions.anonymousOwner") : t("questions.anonymous")}
          </p>
          <Show
            when={count() > 0}
            fallback={
              <Show when={!props.canAsk}>
                <p class={u.muted}>{t("questions.none")}</p>
              </Show>
            }
          >
            <ol class={styles.entries}>
              <For each={props.questions}>
                {(question) => (
                  <QuestionEntry
                    question={question}
                    canAnswer={props.canAnswer}
                    busy={props.busy}
                    onAnswer={(answer) => props.onAnswer(question.id, answer)}
                  />
                )}
              </For>
            </ol>
          </Show>
          <Show when={props.canAsk}>
            <form class={styles.askForm} onSubmit={ask}>
              <label class={styles.label} for={askId}>
                {t("questions.yourQuestion")}
              </label>
              <textarea
                id={askId}
                rows={3}
                maxLength={MAX_QUESTION}
                required
                aria-describedby={askHint}
                value={draft()}
                onInput={(event) => setDraft(event.currentTarget.value)}
              />
              <p id={askHint} class={`${u.muted} ${u.small}`}>
                {t("questions.askHint")}
              </p>
              <div>
                <Button type="submit" disabled={props.busy}>
                  {t("questions.send")}
                </Button>
              </div>
            </form>
          </Show>
          <Show when={props.error}>
            <p class={u.error} role="alert">
              {props.error}
            </p>
          </Show>
          <Show when={props.bought && !props.canAnswer}>
            <p class={`${u.muted} ${u.small}`}>{t("questions.closed")}</p>
          </Show>
        </div>
      </dialog>
    </Show>
  );
}
