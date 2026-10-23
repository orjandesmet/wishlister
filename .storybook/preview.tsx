import { MemoryRouter } from "@solidjs/router";
import type { Preview } from "storybook-solidjs-vite";
import { isLocale } from "../src/i18n/locale.ts";
import { setLocale } from "../src/lib/i18n.ts";
import "../src/index.css";

export default {
  // Every component gets a Docs page with its props and all its stories.
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  // A globe in the toolbar switches every story's language.
  globalTypes: {
    // Forces the light or dark tokens instead of following the system.
    theme: {
      description: "Colour scheme",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "auto", title: "System" },
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Language",
      toolbar: {
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "nl", title: "Nederlands" },
        ],
        dynamicTitle: true,
      },
    },
  },
  // Phone-sized canvas by default: the app is mobile first.
  initialGlobals: { viewport: { value: "mobile2", isRotated: false }, locale: "en", theme: "auto" },
  decorators: [
    // Components use <A> links, which need a router around them.
    (Story) => <MemoryRouter root={() => <Story />} />,
    (Story, context) => {
      const theme: unknown = context.globals.theme;
      document.documentElement.style.colorScheme =
        theme === "light" || theme === "dark" ? theme : "light dark";
      return <Story />;
    },
    (Story, context) => {
      const locale: unknown = context.globals.locale;
      if (isLocale(locale)) setLocale(locale);
      return <Story />;
    },
  ],
} satisfies Preview;
