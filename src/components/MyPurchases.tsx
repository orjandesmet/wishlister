import { createUniqueId, For, Show } from "solid-js";
import type { MyPurchase } from "../lib/api/purchases.ts";
import type { ItemId } from "../lib/ids.ts";
import { locale, t } from "../lib/i18n.ts";
import { purchaseSections } from "../lib/myPurchases.ts";
import { formatOccasionDate, type IsoDate } from "../lib/occasions.ts";
import u from "../utilities.module.css";
import { Card } from "./Card.tsx";
import { Check } from "./Check.tsx";
import { Person } from "./Person.tsx";
import { PriceTag } from "./PriceTag.tsx";
import styles from "./MyPurchases.module.css";

export type MyPurchasesProps = {
  purchases: MyPurchase[];
  today: IsoDate;
  /** Whether to show it ticked; defaults to what was loaded. */
  isDelivered?: (purchase: MyPurchase) => boolean;
  onDelivered: (itemId: ItemId, delivered: boolean) => void;
  /** Whether item cards on the lists show the "Delivered" tick too. */
  showOnCards: boolean;
  onShowOnCards: (on: boolean) => void;
};

/**
 * Everything you marked "I bought this", by occasion and then by person, each with a
 * "delivered" tick that only you see. Past occasions are left out.
 */
export function MyPurchases(props: MyPurchasesProps) {
  const compare = (a: string, b: string) => a.localeCompare(b, locale());
  const sections = () => purchaseSections(props.purchases, props.today, compare);
  const hintId = createUniqueId();

  return (
    <Card>
      <h2>{t("myPurchases.title")}</h2>
      <p class={`${u.muted} ${u.small}`}>{t("myPurchases.help")}</p>
      <div>
        <Check>
          <input
            type="checkbox"
            aria-describedby={hintId}
            checked={props.showOnCards}
            onChange={(e) => props.onShowOnCards(e.currentTarget.checked)}
          />
          {t("myPurchases.showOnCards")}
        </Check>
        <span id={hintId} class={`${u.muted} ${u.small}`}>
          {t("myPurchases.showOnCardsHint")}
        </span>
      </div>
      <Show when={sections().length} fallback={<p class={u.muted}>{t("myPurchases.none")}</p>}>
        <For each={sections()}>
          {(section) => (
            <section class={styles.section}>
              <h3 class={styles.occasion}>
                {section.occasion?.name ?? t("myPurchases.noOccasion")}
                <Show when={section.occasion}>
                  {(occasion) => (
                    <span class={`${u.muted} ${u.small}`}>
                      {formatOccasionDate(occasion().date, locale())}
                    </span>
                  )}
                </Show>
              </h3>
              <For each={section.people}>
                {(person) => (
                  <div class={styles.person}>
                    <Person
                      id={person.listId}
                      name={person.name}
                      href={`/lists/${person.listId}`}
                    />
                    <ul class={u.list}>
                      <For each={person.purchases}>
                        {(purchase) => (
                          <li class={styles.row}>
                            <div class={styles.item}>
                              <span class={styles.name}>{purchase.name}</span>
                              <Show when={purchase.price !== null && purchase.priceCurrency}>
                                <PriceTag
                                  amount={purchase.price!}
                                  currency={purchase.priceCurrency!}
                                  small
                                />
                              </Show>
                              <Show when={purchase.removed}>
                                <span class={`${u.muted} ${u.small}`}>
                                  {t("myPurchases.removed")}
                                </span>
                              </Show>
                            </div>
                            <Check class={styles.delivered}>
                              <input
                                type="checkbox"
                                checked={props.isDelivered?.(purchase) ?? purchase.delivered}
                                onChange={(e) =>
                                  props.onDelivered(purchase.itemId, e.currentTarget.checked)
                                }
                              />
                              {t("myPurchases.delivered")}
                              <span class={u.visuallyHidden}>: {purchase.name}</span>
                            </Check>
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>
                )}
              </For>
            </section>
          )}
        </For>
      </Show>
    </Card>
  );
}
