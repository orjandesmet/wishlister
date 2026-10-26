/**
 * The little bit of markdown an item description understands: paragraphs, line
 * breaks, bulleted and numbered lists, **bold**, *italic* and links (written as
 * [text](https://…) or pasted as they are). Everything else stays plain text.
 *
 * It parses into a small tree that the Markdown component turns into elements, so
 * nobody's text is ever put in the page as HTML: a <script> typed in a description
 * shows up as the word "<script>". Links only go to http(s) and mailto addresses.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "break" };

export type Block =
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; start: number; items: Inline[][] };

const bullet = /^\s*[-*+]\s+(.*)$/;
const numbered = /^\s*(\d{1,9})[.)]\s+(.*)$/;

/** The link if it's safe to open from the app, else null. */
export function safeHref(text: string): string | null {
  try {
    const url = new URL(text.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let lines: string[] = [];
  let list: Extract<Block, { type: "list" }> | null = null;

  const endParagraph = () => {
    if (lines.length === 0) return;
    const children: Inline[] = [];
    lines.forEach((line, index) => {
      if (index > 0) children.push({ type: "break" });
      children.push(...parseInline(line));
    });
    blocks.push({ type: "paragraph", children });
    lines = [];
  };

  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const bulleted = bullet.exec(line);
    const ordered = bulleted ? null : numbered.exec(line);
    if (bulleted || ordered) {
      endParagraph();
      const isOrdered = ordered !== null;
      if (!list || list.ordered !== isOrdered) {
        list = {
          type: "list",
          ordered: isOrdered,
          start: ordered ? Number(ordered[1]) : 1,
          items: [],
        };
        blocks.push(list);
      }
      list.items.push(parseInline(bulleted ? bulleted[1] : ordered![2]));
    } else if (line.trim() === "") {
      endParagraph();
      list = null;
    } else {
      list = null;
      lines.push(line.trim());
    }
  }
  endParagraph();
  return blocks;
}

const wordChar = /[\p{L}\p{N}]/u;
const escapable = /[\\*_[\]()!#`>+-]/;
const bareUrl = /^https?:\/\/[^\s<>]+/;

/** A pasted link without the full stop, comma or closing bracket written after it. */
function trimUrl(url: string) {
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    if (/[.,;:!?'"]/.test(last)) end--;
    else if (last === ")" && count(url.slice(0, end), "(") < count(url.slice(0, end), ")")) end--;
    else break;
  }
  return url.slice(0, end);
}

function count(text: string, char: string) {
  return text.split(char).length - 1;
}

/** Text that may hold emphasis around it: not empty, and not starting or ending with a space. */
function isEmphasis(inner: string) {
  return inner.length > 0 && inner.trim() === inner;
}

export function parseInline(text: string, inLink = false): Inline[] {
  const out: Inline[] = [];
  let plain = "";
  const push = (node: Inline) => {
    if (plain) out.push({ type: "text", text: plain });
    plain = "";
    out.push(node);
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const before = i > 0 ? text[i - 1] : "";

    if (char === "\\" && escapable.test(text[i + 1] ?? "")) {
      plain += text[i + 1];
      i += 2;
      continue;
    }

    if (char === "*" || char === "_") {
      // Underscores inside words (snake_case, file_names) stay as they are.
      const opens = char === "*" || !wordChar.test(before);
      const double = text[i + 1] === char;
      const marker = double ? char + char : char;
      const close = opens ? text.indexOf(marker, i + marker.length) : -1;
      const inner = close === -1 ? "" : text.slice(i + marker.length, close);
      const after = close === -1 ? "" : (text[close + marker.length] ?? "");
      if (close !== -1 && isEmphasis(inner) && (char === "*" || !wordChar.test(after))) {
        push({ type: double ? "strong" : "em", children: parseInline(inner, inLink) });
        i = close + marker.length;
        continue;
      }
    }

    if (char === "[" && !inLink) {
      const labelEnd = text.indexOf("](", i);
      const urlEnd = labelEnd === -1 ? -1 : text.indexOf(")", labelEnd + 2);
      const href = urlEnd === -1 ? null : safeHref(text.slice(labelEnd + 2, urlEnd));
      const label = labelEnd === -1 ? "" : text.slice(i + 1, labelEnd);
      if (href && label.trim()) {
        push({ type: "link", href, children: parseInline(label, true) });
        i = urlEnd + 1;
        continue;
      }
    }

    if (char === "h" && !inLink && !wordChar.test(before)) {
      const match = bareUrl.exec(text.slice(i));
      const url = match ? trimUrl(match[0]) : "";
      const href = url ? safeHref(url) : null;
      if (href) {
        push({ type: "link", href, children: [{ type: "text", text: url }] });
        i += url.length;
        continue;
      }
    }

    plain += char;
    i++;
  }
  if (plain) out.push({ type: "text", text: plain });
  return out;
}

function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) =>
      node.type === "text" ? node.text : node.type === "break" ? " " : inlineText(node.children),
    )
    .join("");
}

/** The description without its formatting, on one line: for a short preview. */
export function plainText(blocks: Block[]): string {
  return blocks
    .map((block) =>
      block.type === "paragraph"
        ? inlineText(block.children)
        : block.items.map((item) => inlineText(item)).join(" · "),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Short enough to show as it is: one paragraph of a couple of lines, no list. */
export function isShort(blocks: Block[], maxLength = 140): boolean {
  if (blocks.length === 0) return true;
  if (blocks.length > 1 || blocks[0].type === "list") return false;
  const breaks = blocks[0].children.filter((node) => node.type === "break").length;
  return breaks === 0 && plainText(blocks).length <= maxLength;
}
