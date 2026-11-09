import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { locale, setLocale } from "../lib/i18n.ts";
import { YouBoughtFor } from "./YouBoughtFor.tsx";

const startLocale = locale();
afterEach(() => {
  setLocale(startLocale);
  document.body.replaceChildren();
});

function mount(occasion: string) {
  const host = document.body.appendChild(document.createElement("div"));
  render(() => <YouBoughtFor occasion={occasion} />, host);
  return { host, parts: [...host.querySelectorAll("span")].map((span) => span.textContent) };
}

describe("YouBoughtFor", () => {
  it("reads as one sentence", () => {
    setLocale("en");
    expect(mount("Christmas").host.textContent).toBe("You bought this for Christmas");
  });

  it("only wraps between the sentence and the occasion", () => {
    setLocale("en");
    expect(mount("Anna's birthday").parts).toEqual(["You bought this for", "Anna's birthday"]);
  });

  it("follows the language", () => {
    setLocale("nl");
    expect(mount("Kerstmis").parts).toEqual(["Jij kocht dit voor", "Kerstmis"]);
  });
});
