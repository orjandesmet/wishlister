import { MemoryRouter } from "@solidjs/router";
import type { Preview } from "storybook-solidjs-vite";
import "../src/index.css";

export default {
  // Every component gets a Docs page with its props and all its stories.
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  // Phone-sized canvas by default: the app is mobile first.
  initialGlobals: { viewport: { value: "mobile2", isRotated: false } },
  // Components use <A> links, which need a router around them.
  decorators: [(Story) => <MemoryRouter root={() => <Story />} />],
} satisfies Preview;
