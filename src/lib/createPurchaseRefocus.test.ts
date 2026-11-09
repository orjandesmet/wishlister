import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createPurchaseRefocus } from "./createPurchaseRefocus.ts";

afterEach(() => document.body.replaceChildren());

/** A container with a pressed button that the saved purchase replaces. */
function setup() {
  const container = document.createElement("div");
  container.tabIndex = -1;
  const button = document.createElement("button");
  container.append(button);
  document.body.append(container);
  return createRoot((dispose) => {
    const [state, setState] = createSignal("available");
    const pressed = createPurchaseRefocus(() => container, state);
    return { container, button, setState, pressed, dispose };
  });
}

describe("createPurchaseRefocus", () => {
  it("moves focus to the button that replaced the pressed one", () => {
    const { container, button, setState, pressed, dispose } = setup();
    button.focus();
    pressed();
    const undo = document.createElement("button");
    undo.dataset.purchase = "";
    button.replaceWith(undo);
    setState("mine");
    expect(document.activeElement).toBe(undo);
    expect(container.contains(undo)).toBe(true);
    dispose();
  });

  it("falls back to the container", () => {
    const { container, button, setState, pressed, dispose } = setup();
    button.focus();
    pressed();
    button.remove();
    setState("mine");
    expect(document.activeElement).toBe(container);
    dispose();
  });

  it("leaves focus alone when nothing was pressed, or focus wasn't lost", () => {
    const { button, setState, pressed, dispose } = setup();
    const elsewhere = document.createElement("input");
    document.body.append(elsewhere);
    setState("someone");
    expect(document.activeElement).toBe(document.body);

    elsewhere.focus();
    pressed();
    button.remove();
    setState("mine");
    expect(document.activeElement).toBe(elsewhere);
    dispose();
  });
});
