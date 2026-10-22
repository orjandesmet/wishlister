import { A } from "@solidjs/router";
import { For } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import { Avatar } from "./Avatar.tsx";

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
        class="menu-button"
        popovertarget="list-menu"
        aria-label={t("wishlist.switchList")}
        title={t("wishlist.switchList")}
      />
      <nav id="list-menu" class="menu" popover aria-label={t("wishlist.switchList")}>
        <For each={props.options}>
          {(option) => (
            <A
              class="person"
              href={`/lists/${option.id}`}
              aria-current={option.id === props.value ? "page" : undefined}
              // Choosing the open list navigates nowhere, so close the menu by hand.
              onClick={(e) => e.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()}
            >
              <Avatar id={option.id} name={option.person} />
              {option.name}
            </A>
          )}
        </For>
      </nav>
    </>
  );
}
