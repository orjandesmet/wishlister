import { useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createResource, createSignal, For, on, Show } from "solid-js";
import { CategoryChips } from "../components/CategoryChips.tsx";
import { addItem, getCategories, getItem, updateItem } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { currencies, displayCurrency, parsePriceInput } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import { isReady } from "../lib/resource.ts";

/** Add an item (/lists/:profileId/items/new) or edit one (/items/:itemId/edit). */
export default function ItemForm() {
  const params = useParams<{ profileId?: ProfileId; itemId?: ItemId }>();
  const navigate = useNavigate();

  const [item] = createResource(() => params.itemId, getItem);
  const profileId = () => params.profileId ?? item()?.profile_id;
  const [profile] = createResource(profileId, getProfileDetails);
  const [categories] = createResource(getCategories);

  const [name, setName] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [notWanted, setNotWanted] = createSignal(false);
  const [price, setPrice] = createSignal("");
  const [currency, setCurrency] = createSignal(displayCurrency());
  // A saved price can be in a currency outside the usual list; keep it choosable.
  const currencyOptions = () =>
    currencies.includes(currency()) ? currencies : [currency(), ...currencies];
  /** "some" with nothing ticked saves the same as "none". */
  const [visibility, setVisibility] = createSignal<"all" | "some" | "none">("all");
  const [groupIds, setGroupIds] = createSignal<GroupId[]>([]);
  // Categories in use plus the starter set in the active language, filtered on what's typed.
  const starterCategories = () => starterCategoryKeys.map((key) => t(`categories.${key}`));
  const allSuggestions = createMemo(() =>
    suggestCategories(categories() ?? [], starterCategories(), "", Infinity),
  );
  const chips = createMemo(() =>
    suggestCategories(categories() ?? [], starterCategories(), category()),
  );
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  // When editing, copy the loaded item into the form once.
  createEffect(
    on(item, (loaded) => {
      if (!loaded) return;
      setName(loaded.name);
      setUrl(loaded.url ?? "");
      setCategory(loaded.category ?? "");
      setNotWanted(loaded.not_wanted);
      if (loaded.price !== null && loaded.price_currency) {
        // Typed back the way the language writes it ("12,50" in Dutch).
        setPrice(
          loaded.price.toLocaleString(locale(), { maximumFractionDigits: 2, useGrouping: false }),
        );
        setCurrency(loaded.price_currency);
      }
      const ids = loaded.item_groups.map((g) => g.group_id);
      setVisibility(loaded.visible_in_all_groups ? "all" : ids.length > 0 ? "some" : "none");
      setGroupIds(ids);
    }),
  );

  const toggleGroup = (id: GroupId, checked: boolean) =>
    setGroupIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(undefined);
    const amount = parsePriceInput(price());
    if (Number.isNaN(amount)) {
      setError(t("itemForm.invalidPrice"));
      return;
    }
    setBusy(true);
    const input = {
      name: name(),
      url: url(),
      category: category(),
      visible_in_all_groups: visibility() === "all",
      not_wanted: notWanted(),
      groupIds: visibility() === "some" ? groupIds() : [],
      price: amount === null ? null : { amount, currency: currency() },
    };
    try {
      if (params.itemId) await updateItem(params.itemId, input);
      else await addItem(profileId()!, input);
      navigate(`/lists/${profileId()}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>{params.itemId ? t("itemForm.editTitle") : t("itemForm.addTitle")}</h1>
      <Show when={item.error}>
        <p class="error">{t("itemForm.loadFailed", { message: item.error.message })}</p>
      </Show>
      {/* When editing, wait for the item so the form never shows blank or default values first. */}
      <Show
        when={!params.itemId || isReady(item)}
        fallback={
          <Show when={!item.error}>
            <p class="muted">{t("common.loading")}</p>
          </Show>
        }
      >
        <form class="card" onSubmit={onSubmit}>
          <label>
            {t("itemForm.name")}
            <input required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </label>
          <label>
            {t("itemForm.link")}
            <input
              type="url"
              inputmode="url"
              placeholder="https://"
              value={url()}
              onInput={(e) => setUrl(e.currentTarget.value)}
            />
          </label>
          <label>
            {t("itemForm.category")}
            <input
              list="category-suggestions"
              value={category()}
              onInput={(e) => setCategory(e.currentTarget.value)}
            />
            <datalist id="category-suggestions">
              <For each={allSuggestions()}>{(c) => <option value={c} />}</For>
            </datalist>
          </label>
          <CategoryChips categories={chips()} onPick={setCategory} />
          <label class="check">
            <input
              type="checkbox"
              checked={notWanted()}
              onChange={(e) => setNotWanted(e.currentTarget.checked)}
            />
            {t("itemForm.notWanted")}
          </label>
          <div class="row price-fields">
            <label>
              {t("itemForm.price")}
              <input
                inputmode="decimal"
                autocomplete="off"
                value={price()}
                onInput={(e) => setPrice(e.currentTarget.value)}
              />
            </label>
            <label>
              {t("itemForm.currency")}
              {/* Per-option selected: a select's value isn't re-applied when its options change. */}
              <select value={currency()} onChange={(e) => setCurrency(e.currentTarget.value)}>
                <For each={currencyOptions()}>
                  {(code) => (
                    <option value={code} selected={code === currency()}>
                      {code}
                    </option>
                  )}
                </For>
              </select>
            </label>
          </div>
          <fieldset>
            <legend>{t("itemForm.visibility")}</legend>
            <label class="check">
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "all"}
                onChange={() => setVisibility("all")}
              />
              {t("itemForm.allGroups")}
            </label>
            <label class="check">
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "some"}
                onChange={() => setVisibility("some")}
              />
              {t("itemForm.selectedGroups")}
            </label>
            <Show when={visibility() === "some"}>
              <div class="indent">
                <For
                  each={profile()?.groups}
                  fallback={
                    <p class="muted small">
                      {isReady(profile) ? t("itemForm.noGroups") : t("common.loading")}
                    </p>
                  }
                >
                  {(group) => (
                    <label class="check">
                      <input
                        type="checkbox"
                        checked={groupIds().includes(group.id)}
                        onChange={(e) => toggleGroup(group.id, e.currentTarget.checked)}
                      />
                      {group.name}
                    </label>
                  )}
                </For>
              </div>
            </Show>
            <label class="check">
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "none"}
                onChange={() => setVisibility("none")}
              />
              {t("itemForm.noGroupsOption")}
            </label>
          </fieldset>
          <button type="submit" disabled={busy()}>
            {busy() ? t("common.saving") : t("common.save")}
          </button>
          <button type="button" class="secondary" onClick={() => history.back()}>
            {t("common.cancel")}
          </button>
          <Show when={error()}>
            <p class="error">{error()}</p>
          </Show>
        </form>
      </Show>
    </>
  );
}
