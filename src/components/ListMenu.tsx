import { For } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { Person } from "./Person.tsx";
import styles from "./ListMenu.module.css";

export type ListMenuProps = {
  /** Whose list is open. */
  value: ProfileId;
  /** Your own list first, then each child you look after. */
  options: { id: ProfileId; name: string; /** Whose initial the tile shows. */ person: string }[];
};

/** For parents: a menu beside the title that opens your own list or one of your children's. */
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
        <For each={props.options}>
          {(option) => (
            <Person
              id={option.id}
              name={option.person}
              class={styles.option}
              href={`/lists/${option.id}`}
              aria-current={option.id === props.value ? "page" : undefined}
              // Choosing the open list navigates nowhere, so close the menu by hand.
              onClick={(e) => e.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()}
            >
              {option.name}
            </Person>
          )}
        </For>
      </nav>
    </>
  );
}
