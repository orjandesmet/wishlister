import { describe, expect, it } from "vite-plus/test";
import { buildQuestionEmails, type QuestionRow } from "./questionNotices.ts";

const row = (overrides: Partial<QuestionRow>): QuestionRow => ({
  kind: "question",
  question_id: "question-1",
  item_id: "item-1",
  item_name: "Scarf",
  list_id: "anna-list",
  list_name: "Anna",
  question: "Which colour?",
  answer: null,
  answerer_name: null,
  own_list: true,
  email: "anna@example.com",
  locale: "en",
  ...overrides,
});

describe("buildQuestionEmails", () => {
  it("tells the owner about a new question, without saying who asked", () => {
    const [email] = buildQuestionEmails([row({})], "https://wishlister.example/");
    expect(email.to).toBe("anna@example.com");
    expect(email.subject).toBe('Someone has a question about "Scarf"');
    expect(email.text).toContain('Someone asked a question about "Scarf" on your wishlist.');
    expect(email.text).toContain("Question: Which colour?");
    expect(email.html).toContain("<blockquote");
    expect(email.html).toContain(
      'href="https://wishlister.example/lists/anna-list?questions=item-1"',
    );
  });

  it("names the child's list for a parent", () => {
    const [email] = buildQuestionEmails(
      [row({ list_name: "Kid", own_list: false, email: "piet@example.com" })],
      "https://wishlister.example",
    );
    expect(email.text).toContain("on Kid's wishlist.");
  });

  it("sends the answer to the one who asked, with who answered", () => {
    const [email] = buildQuestionEmails(
      [
        row({
          kind: "answer",
          answer: "Red, please",
          answerer_name: "Piet",
          list_name: "Kid",
          own_list: false,
          email: "bert@example.com",
        }),
      ],
      "https://wishlister.example",
    );
    expect(email.to).toBe("bert@example.com");
    expect(email.subject).toBe('Your question about "Scarf" was answered');
    expect(email.text).toContain(`Piet answered your question about "Scarf" on Kid's wishlist.`);
    expect(email.text).toContain("Answer: Red, please");
  });

  it("says when an answer they heard about before changed", () => {
    const [email] = buildQuestionEmails(
      [row({ kind: "changed", answer: "Blue after all", answerer_name: "Anna" })],
      "https://wishlister.example",
    );
    expect(email.subject).toBe('The answer to your question about "Scarf" changed');
    expect(email.text).toContain(
      `Anna changed the answer to your question about "Scarf" on Anna's wishlist.`,
    );
    expect(email.text).toContain("Answer: Blue after all");
  });

  it("writes in the recipient's language", () => {
    const [question, answer] = buildQuestionEmails(
      [
        row({ locale: "nl" }),
        row({ kind: "answer", answer: "Rood", answerer_name: "Anna", locale: "nl" }),
      ],
      "https://wishlister.example",
    );
    expect(question.subject).toBe('Iemand heeft een vraag over "Scarf"');
    expect(question.text).toContain("op je verlanglijstje.");
    expect(answer.text).toContain("Antwoord: Rood");
  });

  it("escapes what people typed in the HTML", () => {
    const [email] = buildQuestionEmails(
      [row({ item_name: "<b>Mug</b>", question: "Big <or> small?\nOr medium?" })],
      "https://wishlister.example",
    );
    expect(email.html).toContain("<strong>&lt;b&gt;Mug&lt;/b&gt;</strong>");
    expect(email.html).toContain("Big &lt;or&gt; small?<br>Or medium?");
  });
});
