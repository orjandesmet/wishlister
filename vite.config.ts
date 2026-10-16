import { defineConfig, lazyPlugins } from "vite-plus";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: lazyPlugins(() => [
    solid(),
    // Makes the app installable: writes manifest.webmanifest and a service worker
    // (sw.js) into the build, and registers the worker from index.html.
    VitePWA({
      // A new deploy activates on the next visit, no "update available" prompt.
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Wishlister",
        short_name: "Wishlister",
        description: "Share wishlists with family and friends.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#f7f7f8",
        background_color: "#f7f7f8",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          // The artwork sits in the middle 60%, so Android may crop it to any shape.
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Only the app shell (JS, CSS, HTML, icons) is cached. Supabase calls always
        // go to the network, so lists are never stale.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        // Client-side routes (/login, /lists/…) are answered with the cached index.html,
        // except Netlify's own endpoints.
        navigateFallbackDenylist: [/^\/\.netlify\//],
      },
    }),
  ]),
});
