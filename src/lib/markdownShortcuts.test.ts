import { describe, expect, it } from "vite-plus/test";
import { markdownShortcuts, wrapSelection } from "./markdownShortcuts.ts";

describe("wrapSelection", () => {
  it("wraps the selected text and keeps it selected", () => {
    expect(wrapSelection("say hello now", 4, 9, "**")).toEqual({
      value: "say **hello** now",
      start: 6,
      end: 11,
    });
  });

  it("puts the cursor between the markers when nothing is selected", () => {
    expect(wrapSelection("ab", 1, 1, "*")).toEqual({ value: "a**b", start: 2, end: 2 });
  });
});

describe("markdownShortcuts", () => {
  const press = (key: string, init: KeyboardEventInit, select: [number, number]) => {
    const field = document.createElement("textarea");
    field.value = "hello world";
    field.setSelectionRange(...select);
    let inputs = 0;
    field.addEventListener("input", () => inputs++);
    field.addEventListener("keydown", markdownShortcuts as EventListener);
    const event = new KeyboardEvent("keydown", { key, cancelable: true, ...init });
    field.dispatchEvent(event);
    return { field, event, inputs };
  };

  it("makes the selection bold with ctrl+b and cmd+b", () => {
    expect(press("b", { ctrlKey: true }, [0, 5]).field.value).toBe("**hello** world");
    const { field, event, inputs } = press("b", { metaKey: true }, [6, 11]);
    expect(field.value).toBe("hello **world**");
    expect(event.defaultPrevented).toBe(true);
    expect(inputs).toBe(1);
  });

  it("puts the cursor between the markers when nothing is selected, even if the form rewrites the value", () => {
    const field = document.createElement("textarea");
    field.value = "ab";
    field.setSelectionRange(1, 1);
    // Like a controlled field: writes the value back, which moves the cursor to the end.
    field.addEventListener("input", () => {
      const value = field.value;
      field.value = "";
      field.value = value;
    });
    field.addEventListener("keydown", markdownShortcuts as EventListener);
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true, cancelable: true }),
    );
    expect(field.value).toBe("a****b");
    expect([field.selectionStart, field.selectionEnd]).toEqual([3, 3]);
  });

  it("makes the selection italic with ctrl+i", () => {
    expect(press("i", { ctrlKey: true }, [0, 5]).field.value).toBe("*hello* world");
  });

  it("leaves other keys alone", () => {
    const { field, event } = press("b", {}, [0, 5]);
    expect(field.value).toBe("hello world");
    expect(event.defaultPrevented).toBe(false);
    expect(press("x", { ctrlKey: true }, [0, 5]).event.defaultPrevented).toBe(false);
  });
});
