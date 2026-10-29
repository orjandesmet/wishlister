import { createMemo, createSignal, createUniqueId, For, Show } from "solid-js";
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
 * Remembers which pictures failed to load (moved, or the shop blocks hotlinking), so
 * they are left out instead of showing a broken icon.
 */
function createLoadFailures() {
  const [failed, setFailed] = createSignal<ReadonlySet<string>>(new Set());
  return {
    ok: (src: string) => !failed().has(src),
    fail: (src: string) => setFailed((set) => new Set(set).add(src)),
  };
}

/** Just the thumbnail, as in the item form's preview. */
export function ItemThumbnail(props: { src: string }) {
  const load = createLoadFailures();
  return (
    <Show when={load.ok(props.src)}>
      <Thumb src={props.src} onError={() => load.fail(props.src)} />
    </Show>
  );
}

export type ItemPictureProps = {
  /** The item's pictures, in order (see itemPictureSources). The first is the thumbnail. */
  srcs: string[];
  /** The item's name: the button's label and the bigger view's title. */
  name: string;
  /** Tapping the thumbnail opens the picture bigger. Off while picking items. */
  zoomable: boolean;
  /** Compact cards: a small picture icon instead of the thumbnail; nothing when not zoomable. */
  icon?: boolean;
};

/**
 * The item's picture beside its name. Tapping it opens all its pictures bigger in a
 * modal dialog: Escape, the close button or tapping outside closes it, and focus goes
 * back to the thumbnail. Pictures that don't load are left out. On a compact card a picture
 * icon stands in for the thumbnail, so nothing loads until the dialog opens.
 */
export function ItemPicture(props: ItemPictureProps) {
  const load = createLoadFailures();
  const shown = createMemo(() => props.srcs.filter(load.ok));
  const titleId = createUniqueId();
  // oxlint-disable-next-line no-unassigned-vars
  let dialog: HTMLDialogElement | undefined;
  return (
    <Show when={shown()[0]}>
      {(first) => (
        <Show
          when={props.zoomable}
          fallback={
            <Show when={!props.icon}>
              <Thumb src={first()} onError={() => load.fail(first())} />
            </Show>
          }
        >
          <button
            type="button"
            class={styles.zoom}
            classList={{ [styles.iconButton]: props.icon }}
            onClick={() => dialog?.showModal()}
          >
            <Show
              when={props.icon}
              fallback={<Thumb src={first()} onError={() => load.fail(first())} />}
            >
              {/* Lucide "image" (ISC licence). */}
              <svg
                class={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </Show>
            <Show when={!props.icon && shown().length > 1}>
              <span class={styles.count} aria-hidden="true">
                {shown().length}
              </span>
            </Show>
            <span class={u.visuallyHidden}>
              {shown().length > 1
                ? t("item.viewPictures", { name: props.name, count: shown().length })
                : t("item.viewPicture", { name: props.name })}
            </span>
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
              <For each={shown()}>
                {(src, index) => (
                  <img
                    class={styles.large}
                    src={src}
                    alt={
                      shown().length > 1
                        ? t("item.pictureNumberOf", {
                            name: props.name,
                            number: index() + 1,
                            count: shown().length,
                          })
                        : t("item.pictureOf", { name: props.name })
                    }
                    loading="lazy"
                    decoding="async"
                    referrerpolicy="no-referrer"
                    onError={() => load.fail(src)}
                  />
                )}
              </For>
            </div>
          </dialog>
        </Show>
      )}
    </Show>
  );
}
