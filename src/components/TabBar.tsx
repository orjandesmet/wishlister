import { A } from "@solidjs/router";
import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";

export type TabBarProps = {
  myProfileId: ProfileId;
  /** Looking after children: "My lists" opens an overview instead of your own list. */
  hasChildren: boolean;
};

/** Bottom tabs on a phone, a labelled sidebar on wide screens. */
export function TabBar(props: TabBarProps) {
  return (
    <nav class="tabs">
      <span class="brand">
        <img src="/favicon.svg" alt="" />
        Wishlister
      </span>
      <A href="/" end>
        {t("nav.groups")}
      </A>
      <Show
        when={props.hasChildren}
        fallback={<A href={`/lists/${props.myProfileId}`}>{t("nav.myList")}</A>}
      >
        <A href="/mine">{t("nav.myLists")}</A>
      </Show>
    </nav>
  );
}
