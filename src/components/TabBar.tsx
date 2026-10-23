import { A } from "@solidjs/router";
import type { JSX } from "solid-js";
import { t } from "../lib/i18n.ts";
import type { ProfileId } from "../lib/ids.ts";
import styles from "./TabBar.module.css";

export type TabBarProps = {
  myProfileId: ProfileId;
};

/** Outline icons (Lucide, ISC licence), drawn in the tab's own colour. */
const Icon = (props: { children: JSX.Element }) => (
  <svg
    class={styles.icon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {props.children}
  </svg>
);

/* Parts of each icon that move (see "Tab icons" in TabBar.module.css) are grouped with a class. */
/* Two people, the right one half hidden behind the left. The heads are separate so they can nod. */
const GroupsIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle class={styles.headLeft} cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path class={styles.headRight} d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

const GiftIcon = () => (
  <Icon>
    <g class={styles.giftLid}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </g>
    <path d="M12 12v9" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
  </Icon>
);

const GearIcon = () => (
  <Icon>
    <g class={styles.gear}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  </Icon>
);

/**
 * Bottom tabs on a phone, with the icon above a small label, and a sidebar with the icon beside the
 * label on wide screens.
 */
export function TabBar(props: TabBarProps) {
  return (
    <nav class={styles.tabs} aria-label={t("a11y.mainNav")}>
      <span class={styles.brand}>
        <img src="/favicon.svg" alt="" />
        Wishlister
      </span>
      <A href="/" end>
        <GroupsIcon />
        <span>{t("nav.groups")}</span>
      </A>
      <A href={`/lists/${props.myProfileId}`}>
        <GiftIcon />
        <span>{t("nav.myList")}</span>
      </A>
      <A href="/settings">
        <GearIcon />
        <span>{t("nav.settings")}</span>
      </A>
    </nav>
  );
}
