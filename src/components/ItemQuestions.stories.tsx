import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { Question } from "../lib/api/questions.ts";
import type { ItemId, QuestionId } from "../lib/ids.ts";
import { ItemQuestions } from "./ItemQuestions.tsx";

const question = (n: number, text: string, extra: Partial<Question> = {}): Question => ({
  id: `question-${n}` as QuestionId,
  item_id: "item-1" as ItemId,
  question: text,
  answer: null,
  answerer_name: null,
  answered_at: null,
  created_at: "2026-10-20T10:00:00Z",
  mine: false,
  ...extra,
});

const answered = question(1, "Which size?", {
  answer: "Medium, the large one is too wide.",
  answerer_name: "Anna",
  answered_at: "2026-10-21T08:00:00Z",
});
const open = question(2, "Is the blue one OK too?", { mine: true });

const meta = {
  title: "Wishlist/ItemQuestions",
  component: ItemQuestions,
  args: {
    itemName: "Merino scarf, grey",
    questions: [],
    canAsk: true,
    canAnswer: false,
    bought: false,
    busy: false,
    onAsk: fn(async () => true),
    onAnswer: fn(async () => true),
    onClose: fn(),
  },
} satisfies Meta<typeof ItemQuestions>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Someone else's list, nothing asked yet: only "Ask a question". */
export const NoQuestions: Story = {};

/** Tapping the button opens the dialog; asking sends the question and empties the field. */
export const Ask: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Ask a question/ }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Your question"), "Which size?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Ask anonymously" }));
    await expect(args.onAsk).toHaveBeenCalledWith("Which size?");
    await expect(within(dialog).getByLabelText("Your question")).toHaveValue("");
  },
};

/** Questions with and without an answer, one of them yours. */
export const WithQuestions: Story = {
  args: { questions: [answered, open], open: true },
};

/** Bought: the questions stay, but nobody can ask a new one. */
export const Bought: Story = {
  args: { questions: [answered], canAsk: false, bought: true, open: true },
};

/** Your own list: answer what's open, change what you answered. */
export const Owner: Story = {
  args: {
    questions: [answered, { ...open, mine: false }],
    canAsk: false,
    canAnswer: true,
    open: true,
  },
};

/** Your own list with nothing asked: no button at all. */
export const OwnerNoQuestions: Story = {
  args: { canAsk: false, canAnswer: true },
};

/** Saving failed: the message shows in the dialog, which covers the page's own. */
export const Failed: Story = {
  args: {
    questions: [answered],
    open: true,
    error: "Couldn't reach the server.",
  },
};
