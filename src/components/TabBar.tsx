import { A } from "@solidjs/router";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";

export type TabBarProps = {
  myProfileId: ProfileId;
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
      <A href={`/lists/${props.myProfileId}`}>{t("nav.myList")}</A>
      <A href="/settings">{t("nav.settings")}</A>
    </nav>
  );
}
