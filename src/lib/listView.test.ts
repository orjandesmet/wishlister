import { beforeEach, describe, expect, it } from "vite-plus/test";
import { setCardView } from "./cardView.ts";
import { chooseListView, effectiveListView, listView } from "./listView.ts";

describe("effectiveListView", () => {
  it("only shows cards on small screens, from the account's setting", () => {
    expect(effectiveListView("table", "compact", false)).toBe("compact");
    expect(effectiveListView("full", "compact", false)).toBe("compact");
  });

  it("lets this device's choice win on wide screens", () => {
    expect(effectiveListView("table", "compact", true)).toBe("table");
    expect(effectiveListView("full", "compact", true)).toBe("full");
  });

  it("follows the account until something is picked on this device", () => {
    expect(effectiveListView(undefined, "compact", true)).toBe("compact");
  });
});

describe("chooseListView", () => {
  beforeEach(() => {
    localStorage.clear();
    setCardView("full");
  });

  it("is kept on this device", () => {
    chooseListView("table");
    expect(localStorage.getItem("list-view")).toBe("table");
  });

  it("never shows the table where it doesn't fit", () => {
    // The test window has no wide screen.
    chooseListView("table");
    expect(listView()).toBe("full");
  });
});
