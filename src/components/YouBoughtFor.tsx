import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import u from "../utilities.module.css";

/**
 * "You bought this for Anna's birthday", which only wraps between the sentence and the
 * occasion: each part stays on one line.
 */
export function YouBoughtFor(props: { occasion: string }) {
  const parts = () => {
    const text = t("item.youBoughtFor", { occasion: props.occasion });
    const at = text.lastIndexOf(props.occasion);
    if (at < 0) return [text];
    return [text.slice(0, at).trimEnd(), props.occasion, text.slice(at + props.occasion.length)];
  };
  return (
    <>
      <span class={u.noWrap}>{parts()[0]}</span>
      <Show when={parts().length > 1}>
        {" "}
        <span class={u.noWrap}>
          {parts()[1]}
          {parts()[2]}
        </span>
      </Show>
    </>
  );
}
