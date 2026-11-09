import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ExternalLinkIcon } from "./ExternalLinkIcon.tsx";

afterEach(() => document.body.replaceChildren());

describe("ExternalLinkIcon", () => {
  it("is an outlined icon that screen readers skip", () => {
    const host = document.body.appendChild(document.createElement("div"));
    render(() => <ExternalLinkIcon />, host);
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("fill")).toBe("none");
    expect(svg.querySelectorAll("path")).toHaveLength(3);
  });
});
