import { For } from "solid-js";
import { t } from "../lib/i18n.ts";

/**
 * "I really, really, REALLY want this!!" with the shouted word (all capitals, like
 * REALLY or ECHT) in bold. The texts stay plain strings, so they can be announced too.
 */
export function WantedLevelText(props: { level: 1 | 2 | 3 }) {
  const parts = () => t(`item.wantedLevel${props.level}`).split(/(\b\p{Lu}{2,}\b)/u);
  return <For each={parts()}>{(part, i) => (i() % 2 === 1 ? <strong>{part}</strong> : part)}</For>;
}
