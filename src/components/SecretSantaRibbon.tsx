import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import styles from "./SecretSantaRibbon.module.css";

export type SecretSantaRibbonProps = {
  /** The occasion it's for, said on hover and to screen readers after the label. */
  occasion?: string;
  /** Just the gift, for tight places like a menu. The words stay for screen readers. */
  iconOnly?: boolean;
};

/**
 * "Your Secret Santa": marks the list of the person you drew. Only the one who drew them
 * sees it. The words carry the meaning; the gift is decoration.
 */
export function SecretSantaRibbon(props: SecretSantaRibbonProps) {
  return (
    <span
      class={props.iconOnly ? `${styles.ribbon} ${styles.iconOnly}` : styles.ribbon}
      title={
        props.occasion
          ? t("secretSanta.ribbonFor", { occasion: props.occasion })
          : props.iconOnly
            ? t("secretSanta.ribbon")
            : undefined
      }
    >
      {/* Lucide "gift" (ISC licence). */}
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
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
      </svg>
      <Show when={props.iconOnly} fallback={t("secretSanta.ribbon")}>
        <span class={styles.hidden}>{t("secretSanta.ribbon")}</span>
      </Show>
      <Show when={props.occasion}>
        <span class={styles.hidden}>
          {" "}
          ({t("secretSanta.ribbonFor", { occasion: props.occasion! })})
        </span>
      </Show>
    </span>
  );
}
