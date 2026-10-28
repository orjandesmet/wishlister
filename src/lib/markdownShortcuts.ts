const markers = { b: "**", i: "*" } as const;

/**
 * Wraps the selection in markdown markers, or puts a pair of them around the cursor.
 * The selection stays on the same text, or the cursor lands between the markers.
 */
export function wrapSelection(value: string, start: number, end: number, marker: string) {
  return {
    value: value.slice(0, start) + marker + value.slice(start, end) + marker + value.slice(end),
    start: start + marker.length,
    end: end + marker.length,
  };
}

/** Cmd/Ctrl+B makes the selection bold, Cmd/Ctrl+I italic. For a markdown textarea's keydown. */
export function markdownShortcuts(event: KeyboardEvent & { currentTarget: HTMLTextAreaElement }) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
  const marker = markers[event.key.toLowerCase() as keyof typeof markers];
  if (!marker) return;
  event.preventDefault();

  const field = event.currentTarget;
  const next = wrapSelection(field.value, field.selectionStart, field.selectionEnd, marker);
  if (field.maxLength >= 0 && next.value.length > field.maxLength) return;
  field.value = next.value;
  // Tells the form about the change, like typing would.
  field.dispatchEvent(new Event("input", { bubbles: true }));
  // The form writing the value back can move the cursor to the end, so place it afterwards.
  const select = () => field.setSelectionRange(next.start, next.end);
  select();
  queueMicrotask(select);
  requestAnimationFrame(select);
}
