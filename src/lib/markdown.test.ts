import { describe, expect, it } from "vite-plus/test";
import { isShort, parseInline, parseMarkdown, plainText, safeHref } from "./markdown.ts";

const text = (value: string) => ({ type: "text", text: value });

describe("parseInline", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("Size 38, the blue one")).toEqual([text("Size 38, the blue one")]);
  });

  it("reads bold and italic, also inside each other", () => {
    expect(parseInline("**not** the *green* one")).toEqual([
      { type: "strong", children: [text("not")] },
      text(" the "),
      { type: "em", children: [text("green")] },
      text(" one"),
    ]);
    expect(parseInline("__really *big*__")).toEqual([
      {
        type: "strong",
        children: [text("really "), { type: "em", children: [text("big")] }],
      },
    ]);
  });

  it("keeps stray stars and underscores in words as they are", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([text("2 * 3 = 6")]);
    expect(parseInline("my_file_name")).toEqual([text("my_file_name")]);
    expect(parseInline("** nothing **")).toEqual([text("** nothing **")]);
    expect(parseInline("\\*not italic\\*")).toEqual([text("*not italic*")]);
  });

  it("reads links written in markdown", () => {
    expect(parseInline("see [this shop](https://shop.example/a)")).toEqual([
      text("see "),
      { type: "link", href: "https://shop.example/a", children: [text("this shop")] },
    ]);
  });

  it("turns pasted links into links, without the punctuation after them", () => {
    expect(parseInline("At https://shop.example/a. Or (https://shop.example/b)")).toEqual([
      text("At "),
      { type: "link", href: "https://shop.example/a", children: [text("https://shop.example/a")] },
      text(". Or ("),
      { type: "link", href: "https://shop.example/b", children: [text("https://shop.example/b")] },
      text(")"),
    ]);
  });

  it("never links to anything but web and mail addresses", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([
      text("[click](javascript:alert(1))"),
    ]);
    expect(parseInline("[file](file:///etc/passwd)")).toEqual([text("[file](file:///etc/passwd)")]);
    expect(parseInline("[mail me](mailto:a@example.com)")).toEqual([
      { type: "link", href: "mailto:a@example.com", children: [text("mail me")] },
    ]);
  });

  it("keeps HTML as text", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([text("<script>alert(1)</script>")]);
  });
});

describe("parseMarkdown", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseMarkdown("One\ntwo\n\nThree")).toEqual([
      { type: "paragraph", children: [text("One"), { type: "break" }, text("two")] },
      { type: "paragraph", children: [text("Three")] },
    ]);
  });

  it("reads bulleted and numbered lists", () => {
    expect(parseMarkdown("Colours:\n- blue\n* *green*\n\n3. three\n4) four")).toEqual([
      { type: "paragraph", children: [text("Colours:")] },
      {
        type: "list",
        ordered: false,
        start: 1,
        items: [[text("blue")], [{ type: "em", children: [text("green")] }]],
      },
      { type: "list", ordered: true, start: 3, items: [[text("three")], [text("four")]] },
    ]);
  });

  it("gives nothing for an empty description", () => {
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });
});

describe("plainText and isShort", () => {
  it("shows a description without its formatting", () => {
    expect(plainText(parseMarkdown("**Size** 38\n\n- blue\n- [red](https://x.example)"))).toBe(
      "Size 38 blue · red",
    );
  });

  it("calls one short paragraph short", () => {
    expect(isShort(parseMarkdown("The **blue** one"))).toBe(true);
    expect(isShort(parseMarkdown("One\ntwo"))).toBe(false);
    expect(isShort(parseMarkdown("- a list"))).toBe(false);
    expect(isShort(parseMarkdown("x".repeat(141)))).toBe(false);
  });
});

describe("safeHref", () => {
  it("accepts web and mail addresses only", () => {
    expect(safeHref(" https://shop.example/a ")).toBe("https://shop.example/a");
    expect(safeHref("JAVASCRIPT:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
    expect(safeHref("not a link")).toBeNull();
  });
});
