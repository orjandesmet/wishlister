import { createEffect, createSignal, createUniqueId, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import { parseMarkdown } from "../lib/markdown.ts";
import { markdownShortcuts } from "../lib/markdownShortcuts.ts";
import u from "../utilities.module.css";
import { Button } from "./Button.tsx";
import { Markdown } from "./Markdown.tsx";
import styles from "./MarkdownField.module.css";

export type MarkdownFieldProps = {
  label: string;
  value: string;
  onInput: (value: string) => void;
  rows?: number;
  maxLength?: number;
  /** Id of the element that explains the field. */
  describedBy?: string;
};

/** A labelled textarea for markdown, with Cmd/Ctrl+B and I, and a toggle to see how it will read. */
export function MarkdownField(props: MarkdownFieldProps) {
  const id = createUniqueId();
  const [previewing, setPreviewing] = createSignal(false);
  const [field, setField] = createSignal<HTMLTextAreaElement>();
  // Only written when it differs: writing back what was just typed moves the cursor to the end.
  createEffect(() => {
    const value = props.value;
    const el = field();
    if (el && el.value !== value) el.value = value;
  });
  return (
    <div class={styles.field}>
      <div class={styles.header}>
        <label for={`markdown-${id}`}>{props.label}</label>
        <Button
          variant="link"
          size="small"
          aria-pressed={previewing()}
          aria-controls={`preview-${id}`}
          onClick={() => setPreviewing(!previewing())}
        >
          {previewing() ? t("common.edit") : t("common.preview")}
        </Button>
      </div>
      <textarea
        ref={setField}
        id={`markdown-${id}`}
        hidden={previewing()}
        rows={props.rows}
        maxLength={props.maxLength}
        aria-describedby={props.describedBy}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onKeyDown={markdownShortcuts}
      />
      <div id={`preview-${id}`} class={styles.preview} hidden={!previewing()}>
        <Show
          when={props.value.trim()}
          fallback={<p class={u.muted}>{t("common.nothingToPreview")}</p>}
        >
          <Markdown blocks={parseMarkdown(props.value)} />
        </Show>
      </div>
    </div>
  );
}
