import { Show } from "solid-js";
import { t } from "../lib/i18n.ts";
import styles from "./SecretSantaRibbon.module.css";
import { SecretSantaIcon } from "./SecretSantaIcon.tsx";

export type SecretSantaRibbonProps = {
  /** The occasion it's for, said on hover and to screen readers after the label. */
  occasion?: string;
  /** Just the Santa, for tight places like a menu. The words stay for screen readers. */
  iconOnly?: boolean;
};

/**
 * "Your Secret Santa": marks the list of the person you drew. Only the one who drew them
 * sees it. The words carry the meaning; the Santa is decoration.
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
      <SecretSantaIcon class={styles.icon} />
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
