import { createSignal, createUniqueId, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import styles from "./ItemPicture.module.css";

/**
 * The picture at thumbnail size. Decorative: the name beside it already says what it
 * is, so screen readers skip it (empty alt).
 */
function Thumb(props: { src: string; onError: () => void }) {
  return (
    <img
      class={styles.thumb}
      src={props.src}
      alt=""
      width="72"
      height="72"
      loading="lazy"
      decoding="async"
      // Some shops refuse pictures shown on other sites; without a referrer most allow it.
      referrerpolicy="no-referrer"
      onError={() => props.onError()}
    />
  );
}

/**
 * Remembers which picture failed to load (moved, or the shop blocks hotlinking), so it
 * is left out instead of showing a broken icon. A new src gets another try.
 */
function createLoadFailure(src: () => string) {
  const [failed, setFailed] = createSignal<string>();
  return { ok: () => failed() !== src(), fail: () => setFailed(src()) };
}

/** Just the thumbnail, as in the item form's preview. */
export function ItemThumbnail(props: { src: string }) {
  const load = createLoadFailure(() => props.src);
  return (
    <Show when={load.ok()}>
      <Thumb src={props.src} onError={load.fail} />
    </Show>
  );
}

export type ItemPictureProps = {
  src: string;
  /** The item's name: the button's label and the bigger view's title. */
  name: string;
  /** Tapping the thumbnail opens the picture bigger. Off while picking items. */
  zoomable: boolean;
};

/**
 * The item's picture beside its name. Tapping it opens the picture bigger in a modal
 * dialog: Escape, the close button or tapping outside closes it, and focus goes back
 * to the thumbnail.
 */
export function ItemPicture(props: ItemPictureProps) {
  const load = createLoadFailure(() => props.src);
  const titleId = createUniqueId();
  // oxlint-disable-next-line no-unassigned-vars
  let dialog: HTMLDialogElement | undefined;
  return (
    <Show when={load.ok()}>
      <Show when={props.zoomable} fallback={<Thumb src={props.src} onError={load.fail} />}>
        <button type="button" class={styles.zoom} onClick={() => dialog?.showModal()}>
          <Thumb src={props.src} onError={load.fail} />
          <span class={u.visuallyHidden}>{t("item.viewPicture", { name: props.name })}</span>
        </button>
        <dialog
          ref={dialog}
          class={styles.viewer}
          aria-labelledby={titleId}
          // The dialog itself has no padding, so only a tap on the backdrop lands on it.
          onClick={(event) => event.target === event.currentTarget && dialog?.close()}
        >
          <div class={styles.viewerBody}>
            <div class={styles.viewerHead}>
              <h2 id={titleId} class={styles.viewerTitle}>
                {props.name}
              </h2>
              <Button
                variant="link"
                size="small"
                class={styles.close}
                aria-label={t("common.close")}
                onClick={() => dialog?.close()}
              >
                ×
              </Button>
            </div>
            <img
              class={styles.large}
              src={props.src}
              alt={t("item.pictureOf", { name: props.name })}
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            />
          </div>
        </dialog>
      </Show>
    </Show>
  );
}
