import { Match, Switch } from "solid-js";
import { t } from "../lib/i18n.ts";

export type InstallBannerProps = {
  /** "prompt" when the browser can install the app itself, "ios" for the share-menu steps. */
  mode: "prompt" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
};

/** Lookalike of the iOS share glyph: an arrow leaving an open-topped box. */
function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1.2em"
      height="1.2em"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={{ "vertical-align": "-0.25em" }}
    >
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}

/** Suggests adding the app to the home screen. Only shows things; the caller decides when. */
export function InstallBanner(props: InstallBannerProps) {
  return (
    <aside class="notice install-banner" aria-label={t("install.label")}>
      <div class="row">
        <strong>{t("install.title")}</strong>
        <button
          type="button"
          class="link small"
          aria-label={t("install.dismiss")}
          onClick={() => props.onDismiss()}
        >
          ×
        </button>
      </div>
      <Switch>
        <Match when={props.mode === "prompt"}>
          <p class="muted small">{t("install.promptText")}</p>
          <button type="button" onClick={() => props.onInstall()}>
            {t("install.install")}
          </button>
        </Match>
        <Match when={props.mode === "ios"}>
          <p class="muted small">{t("install.iosSteps", { shareIcon: <ShareIcon /> })}</p>
        </Match>
      </Switch>
    </aside>
  );
}
