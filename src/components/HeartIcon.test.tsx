import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { HeartIcon } from "./HeartIcon.tsx";

afterEach(() => document.body.replaceChildren());

describe("HeartIcon", () => {
  it("is a filled icon that screen readers skip", () => {
    const host = document.body.appendChild(document.createElement("div"));
    render(() => <HeartIcon />, host);
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("fill")).toBe("currentColor");
    expect(svg.querySelector("path")).not.toBeNull();
  });
});
