import { beforeEach, describe, expect, it } from "vite-plus/test";
import { cardView, chooseCardView, setCardView } from "./cardView.ts";

describe("card view", () => {
  beforeEach(() => {
    localStorage.clear();
    setCardView("full");
  });

  it("keeps a copy of the choice on this device", () => {
    setCardView("compact");
    expect(cardView()).toBe("compact");
    expect(localStorage.getItem("card-view")).toBe("compact");
  });

  it("switches right away and saves the choice", async () => {
    const saved: string[] = [];
    await chooseCardView("compact", async (view) => {
      expect(cardView()).toBe("compact");
      saved.push(view);
    });
    expect(saved).toEqual(["compact"]);
  });

  it("switches back when saving fails", async () => {
    await expect(
      chooseCardView("compact", () => Promise.reject(new Error("offline"))),
    ).rejects.toThrow("offline");
    expect(cardView()).toBe("full");
  });
});
