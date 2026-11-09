interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** "true" on the demo site. */
  readonly VITE_DEMO?: string;
  /** Set at build time: the release tag the build is on, else the short commit hash. */
  readonly VITE_APP_VERSION?: string;
}
