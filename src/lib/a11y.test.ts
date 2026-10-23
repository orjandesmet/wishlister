import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { announce, focusHeading } from "./a11y.ts";

describe("announce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const region = () => document.querySelector('[role="status"]');

  it("puts the message in one polite live region", () => {
    announce("Added Lego.");
    vi.advanceTimersByTime(100);
    announce("Removed Lego.");
    vi.advanceTimersByTime(100);
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(region()?.getAttribute("aria-live")).toBe("polite");
    expect(region()?.textContent).toBe("Removed Lego.");
  });

  it("empties the region first, so the same message is read again", () => {
    announce("Added Lego.");
    vi.advanceTimersByTime(100);
    announce("Added Lego.");
    expect(region()?.textContent).toBe("");
    vi.advanceTimersByTime(100);
    expect(region()?.textContent).toBe("Added Lego.");
  });
});

describe("focusHeading", () => {
  afterEach(() => document.body.replaceChildren());

  it("focuses the page's heading without adding it to the tab order", () => {
    document.body.innerHTML = "<main><h1>My groups</h1></main>";
    focusHeading();
    const heading = document.querySelector("h1")!;
    expect(document.activeElement).toBe(heading);
    expect(heading.tabIndex).toBe(-1);
  });

  it("does nothing on a page without a heading", () => {
    document.body.innerHTML = "<main><p>Loading…</p></main>";
    expect(() => focusHeading()).not.toThrow();
  });
});
