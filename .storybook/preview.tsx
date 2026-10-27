import { MemoryRouter } from "@solidjs/router";
import type { Preview } from "storybook-solidjs-vite";
import { sb } from "storybook/test";
import { isLocale } from "../src/i18n/locale.ts";
import { clearCache } from "../src/lib/cache.ts";
import { setLocale } from "../src/lib/i18n.ts";
import { isTheme, setThemePreview } from "../src/lib/theme.ts";
import "../src/index.css";

// The Screens stories render the real pages. Their data comes from these mocks instead of
// Supabase: each story sets what the API calls return (see src/stories/Screens.stories.tsx).
// supabase.ts is replaced by src/lib/__mocks__/supabase.ts, which answers the auth calls.
sb.mock(import("../src/lib/supabase.ts"));
sb.mock(import("../src/lib/api/children.ts"));
sb.mock(import("../src/lib/api/follows.ts"));
sb.mock(import("../src/lib/api/groups.ts"));
sb.mock(import("../src/lib/api/items.ts"));
sb.mock(import("../src/lib/api/occasions.ts"));
sb.mock(import("../src/lib/api/pageInfo.ts"));
sb.mock(import("../src/lib/api/pictures.ts"));
sb.mock(import("../src/lib/api/profiles.ts"));
sb.mock(import("../src/lib/api/purchases.ts"));
sb.mock(import("../src/lib/api/questions.ts"));
sb.mock(import("../src/lib/api/secretSanta.ts"));
// Real code, but a story can fix the date or show the install banner.
sb.mock(import("../src/lib/occasions.ts"), { spy: true });
sb.mock(import("../src/lib/install.ts"), { spy: true });

export default {
  // The pages remember what they loaded (src/lib/cache.ts): start every story without.
  beforeEach: () => clearCache(),
  // Every component gets a Docs page with its props and all its stories.
  tags: ["autodocs"],
  parameters: {
    layout: "padded",

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
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
    // A brush in the toolbar puts every story in one of the seasonal themes.
    appTheme: {
      description: "App theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "none", title: "No theme" },
          { value: "sinterklaas", title: "Sinterklaas" },
          { value: "christmas", title: "Christmas" },
          { value: "newYear", title: "New Year" },
          { value: "birthday", title: "Birthday (1 March)" },
          { value: "halloween", title: "Halloween" },
          { value: "easter", title: "Easter" },
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
  initialGlobals: {
    viewport: { value: "mobile2", isRotated: false },
    locale: "en",
    theme: "auto",
    appTheme: "default",
  },
  decorators: [
    // Components use <A> links, which need a router around them. Stories that bring their
    // own router (the Screens stories render the app's) set parameters.router to false.
    (Story, context) =>
      context.parameters.router === false ? <Story /> : <MemoryRouter root={() => <Story />} />,
    (Story, context) => {
      const theme: unknown = context.globals.theme;
      // Left to the stylesheet when "System", so Halloween can still force dark.
      document.documentElement.style.colorScheme =
        theme === "light" || theme === "dark" ? theme : "";
      // The Screens stories show the theme's decorations and hats from this preview.
      const appTheme: unknown = context.globals.appTheme;
      setThemePreview({ theme: isTheme(appTheme) ? appTheme : "none" });
      if (isTheme(appTheme)) document.documentElement.dataset.theme = appTheme;
      else delete document.documentElement.dataset.theme;
      return <Story />;
    },
    (Story, context) => {
      const locale: unknown = context.globals.locale;
      if (isLocale(locale)) setLocale(locale);
      return <Story />;
    },
  ],
} satisfies Preview;
