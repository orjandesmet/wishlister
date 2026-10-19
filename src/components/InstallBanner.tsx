import { Match, Switch } from "solid-js";

export type InstallBannerProps = {
  /** "prompt" when the browser can install the app itself, "ios" for the share-menu steps. */
  mode: "prompt" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
};

/** Suggests adding the app to the home screen. Only shows things; the caller decides when. */
export function InstallBanner(props: InstallBannerProps) {
  return (
    <aside class="notice install-banner" aria-label="Add to home screen">
      <div class="row">
        <strong>Add Wishlister to your home screen</strong>
        <button
          type="button"
          class="link small"
          aria-label="Dismiss"
          onClick={() => props.onDismiss()}
        >
          ✕
        </button>
      </div>
      <Switch>
        <Match when={props.mode === "prompt"}>
          <p class="muted small">It opens like an app, without the browser around it.</p>
          <button type="button" onClick={() => props.onInstall()}>
            Install
          </button>
        </Match>
        <Match when={props.mode === "ios"}>
          <p class="muted small">
            Tap the Share button <span aria-hidden="true">(□↑)</span>, then{" "}
            <strong>Add to Home Screen</strong>.
          </p>
        </Match>
      </Switch>
    </aside>
  );
}
