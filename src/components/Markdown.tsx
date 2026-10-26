import { For, Match, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Block, Inline } from "../lib/markdown.ts";
import styles from "./Markdown.module.css";

function Inlines(props: { nodes: Inline[] }) {
  return (
    <For each={props.nodes}>
      {(node) => (
        <Switch>
          <Match when={node.type === "text" && node}>{(n) => n().text}</Match>
          <Match when={node.type === "break"}>
            <br />
          </Match>
          <Match when={node.type === "strong" && node}>
            {(n) => (
              <strong>
                <Inlines nodes={n().children} />
              </strong>
            )}
          </Match>
          <Match when={node.type === "em" && node}>
            {(n) => (
              <em>
                <Inlines nodes={n().children} />
              </em>
            )}
          </Match>
          <Match when={node.type === "link" && node}>
            {(n) => (
              // Someone else's link: opens apart from the app, and tells the site nothing.
              <a href={n().href} target="_blank" rel="noopener noreferrer nofollow">
                <Inlines nodes={n().children} />
              </a>
            )}
          </Match>
        </Switch>
      )}
    </For>
  );
}

/**
 * Text parsed by parseMarkdown, as real paragraphs, lists and links. Built from
 * elements, never from HTML, so whatever was typed can't run or restyle the page.
 */
export function Markdown(props: { blocks: Block[]; id?: string; class?: string }) {
  return (
    <div id={props.id} class={`${styles.markdown} ${props.class ?? ""}`}>
      <For each={props.blocks}>
        {(block) =>
          block.type === "paragraph" ? (
            <p>
              <Inlines nodes={block.children} />
            </p>
          ) : (
            <Dynamic
              component={block.ordered ? "ol" : "ul"}
              start={block.ordered && block.start !== 1 ? block.start : undefined}
            >
              <For each={block.items}>
                {(item) => (
                  <li>
                    <Inlines nodes={item} />
                  </li>
                )}
              </For>
            </Dynamic>
          )
        }
      </For>
    </div>
  );
}
