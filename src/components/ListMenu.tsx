import { createUniqueId, For, Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import type { ListMenuSection } from "../lib/listMenu.ts";
import { Person } from "./Person.tsx";
import { SecretSantaRibbon } from "./secret-santa/SecretSantaRibbon.tsx";
import styles from "./ListMenu.module.css";

export type ListMenuProps = {
  /** Whose list is open. */
  value: ProfileId;
  /** Your own list and your children's first, then one titled section per group. */
  sections: ListMenuSection[];
};

/** A menu beside the title that opens your own list, a child's, or anyone's from your groups. */
export function ListMenu(props: ListMenuProps) {
  return (
    <>
      <button
        type="button"
        class={styles.menuButton}
        popovertarget="list-menu"
        aria-label={t("wishlist.switchList")}
        title={t("wishlist.switchList")}
      />
      <nav id="list-menu" class={styles.menu} popover aria-label={t("wishlist.switchList")}>
        <For each={props.sections}>
          {(section) => {
            const headingId = createUniqueId();
            return (
              <div
                class={styles.section}
                role={section.title ? "group" : undefined}
                aria-labelledby={section.title ? headingId : undefined}
              >
                <Show when={section.title}>
                  <h2 id={headingId} class={styles.heading}>
                    {section.title}
                  </h2>
                </Show>
                <For each={section.options}>
                  {(option) => (
                    <Person
                      id={option.id}
                      name={option.person}
                      class={styles.option}
                      href={`/lists/${option.id}`}
                      aria-current={option.id === props.value ? "page" : undefined}
                      // Choosing the open list navigates nowhere, so close the menu by hand.
                      onClick={(e) =>
                        e.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()
                      }
                    >
                      {option.name}
                      <Show when={option.ribbon}>
                        <SecretSantaRibbon iconOnly />
                      </Show>
                    </Person>
                  )}
                </For>
              </div>
            );
          }}
        </For>
      </nav>
    </>
  );
}
