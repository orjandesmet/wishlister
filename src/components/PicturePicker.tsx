import { createSignal, createUniqueId, For, Show } from "solid-js";
import { focusSoon } from "../lib/a11y.ts";
import { t } from "../lib/i18n.ts";
import { pictureLink } from "../lib/itemPictures.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { ItemThumbnail } from "./ItemPicture.tsx";
import styles from "./PicturePicker.module.css";

export type PicturePickerProps = {
  /** The pictures so far, in order. `key` tells them apart. */
  pictures: { key: string; src: string }[];
  max: number;
  /** Pictures chosen on the phone or computer (or taken with the camera). */
  onAddFiles: (files: File[]) => void;
  /** A link to a picture elsewhere, checked to be http(s). */
  onAddLink: (url: string) => void;
  onRemove: (key: string) => void;
};

/**
 * The item's own pictures in the item form: thumbnails with a remove button each, a
 * button to choose pictures (phones offer the camera too) and a field for a link to a
 * picture. Nothing is uploaded here; the form does that when it's saved.
 */
export function PicturePicker(props: PicturePickerProps) {
  const hintId = createUniqueId();
  const linkErrorId = createUniqueId();
  const [link, setLink] = createSignal("");
  const [linkError, setLinkError] = createSignal(false);
  // oxlint-disable-next-line no-unassigned-vars
  let fileInput: HTMLInputElement | undefined;
  const [addButton, setAddButton] = createSignal<HTMLButtonElement>();
  const [linkInput, setLinkInput] = createSignal<HTMLInputElement>();
  const full = () => props.pictures.length >= props.max;

  function addLink() {
    const url = pictureLink(link());
    if (!url) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    setLink("");
    props.onAddLink(url);
  }

  function remove(key: string, index: number) {
    props.onRemove(key);
    // The button is gone: on to the picture that took its place, or the add button.
    focusSoon(
      () =>
        document.querySelectorAll<HTMLElement>(`[data-picture-remove]`)[index] ??
        document.querySelectorAll<HTMLElement>(`[data-picture-remove]`)[index - 1] ??
        addButton(),
    );
  }

  return (
    <fieldset class={styles.picker} aria-describedby={hintId}>
      <legend>{t("pictures.legend")}</legend>
      <p id={hintId} class={`${u.muted} ${u.small} ${styles.hint}`}>
        {t("pictures.hint", { max: props.max })}
      </p>
      <Show when={props.pictures.length > 0}>
        <ul class={styles.list}>
          <For each={props.pictures}>
            {(picture, index) => (
              <li class={styles.picture}>
                <ItemThumbnail src={picture.src} />
                <Button
                  variant="link"
                  danger
                  data-picture-remove
                  onClick={() => remove(picture.key, index())}
                >
                  {t("pictures.remove")}
                  <span class={u.visuallyHidden}>
                    {" "}
                    {t("pictures.number", { number: index() + 1 })}
                  </span>
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={full()}>
        <p class={`${u.muted} ${u.small}`}>{t("pictures.full", { max: props.max })}</p>
      </Show>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          // Emptied, so choosing the same picture again still counts as a change.
          e.currentTarget.value = "";
          if (files.length > 0) props.onAddFiles(files);
        }}
      />
      <Button
        ref={setAddButton}
        variant="secondary"
        disabled={full()}
        onClick={() => fileInput?.click()}
      >
        {t("pictures.add")}
      </Button>
      <div class={styles.linkRow}>
        <label class={styles.linkLabel}>
          {t("pictures.link")}
          <input
            ref={setLinkInput}
            type="url"
            inputmode="url"
            placeholder="https://"
            disabled={full()}
            value={link()}
            aria-invalid={linkError() || undefined}
            aria-describedby={linkError() ? linkErrorId : undefined}
            onInput={(e) => {
              setLink(e.currentTarget.value);
              setLinkError(false);
            }}
            // Enter adds the link instead of saving the whole form.
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              addLink();
            }}
          />
        </label>
        <Button
          variant="secondary"
          disabled={full() || !link().trim()}
          onClick={() => {
            addLink();
            if (!linkError()) focusSoon(linkInput);
          }}
        >
          {t("pictures.addLink")}
        </Button>
      </div>
      <Show when={linkError()}>
        <p id={linkErrorId} class={u.error} role="alert">
          {t("pictures.badLink")}
        </p>
      </Show>
    </fieldset>
  );
}
