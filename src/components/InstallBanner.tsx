import { Match, Switch } from "solid-js";
import { t } from "../lib/i18n.ts";

export type InstallBannerProps = {
  /** "prompt" when the browser can install the app itself, "ios" for the share-menu steps. */
  mode: "prompt" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
};

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
          <p class="muted small">
            {t("install.iosSteps", { shareIcon: <span aria-hidden="true">(□↑)</span> })}
          </p>
        </Match>
      </Switch>
    </aside>
  );
}
