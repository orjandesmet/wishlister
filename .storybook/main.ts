import type { StorybookConfig } from "storybook-solidjs-vite";

export default {
  framework: "storybook-solidjs-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  // The app's vite.config.ts is used as is, minus the PWA plugin: Storybook needs
  // no service worker, and one would cache old stories.
  async viteFinal(config) {
    return {
      ...config,
      plugins: (config.plugins ?? []).flat().filter((plugin) => {
        const name = plugin && typeof plugin === "object" && "name" in plugin ? plugin.name : "";
        return !String(name).startsWith("vite-plugin-pwa");
      }),
    };
  },
} satisfies StorybookConfig;
