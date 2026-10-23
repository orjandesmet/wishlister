import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { createEffect, createMemo, createResource, createSignal, For, on, Show } from "solid-js";
import { CategoryChips } from "../components/CategoryChips.tsx";
import { addItem, getCategories, getItem, updateItem } from "../lib/api/items.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { currencies, displayCurrency, parsePriceInput } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import type { ItemDraft } from "../lib/itemDraft.ts";
import { splitLink } from "../lib/links.ts";
import { splitNotWanted } from "../lib/notWanted.ts";
import { isReady } from "../lib/resource.ts";
import { Select } from "../components/Select.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Check } from "../components/Check.tsx";
import styles from "./ItemForm.module.css";

/** Add an item (/lists/:profileId/items/new) or edit one (/items/:itemId/edit). */
export default function ItemForm() {
  const params = useParams<{ profileId?: ProfileId; itemId?: ItemId }>();
  const navigate = useNavigate();
  const location = useLocation<ItemDraft>();

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
  const [savedName, setSavedName] = createSignal<string>();
  const [nameInput, setNameInput] = createSignal<HTMLInputElement>();

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

  // Coming from quick add: carry on with what was typed there.
  const draft = location.state;
  if (draft && !params.itemId) {
    const { notWanted: unwanted, text } = splitNotWanted(draft.text ?? "");
    const { url: link, name: typedName } = splitLink(text);
    setName(typedName);
    setUrl(link ?? "");
    setNotWanted(unwanted);
    const picked = draft.groups ?? "all";
    const ids = picked === "all" ? [] : picked;
    setVisibility(picked === "all" ? "all" : ids.length > 0 ? "some" : "none");
    setGroupIds(ids);
  }

  const toggleGroup = (id: GroupId, checked: boolean) =>
    setGroupIds((ids) => (checked ? [...ids, id] : ids.filter((other) => other !== id)));

  async function onSubmit(event: SubmitEvent) {
    event.preventDefault();
    const another = event.submitter?.hasAttribute("data-another") ?? false;
    setError(undefined);
    setSavedName(undefined);
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
      if (another) {
        // Starts the next item; the category, groups and currency tend to stay the same.
        setSavedName(input.name);
        setName("");
        setUrl("");
        setPrice("");
        setNotWanted(false);
        setBusy(false);
        nameInput()?.focus();
        return;
      }
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
        <p class={u.error}>{t("itemForm.loadFailed", { message: item.error.message })}</p>
      </Show>
      {/* When editing, wait for the item so the form never shows blank or default values first. */}
      <Show
        when={!params.itemId || isReady(item)}
        fallback={
          <Show when={!item.error}>
            <p class={u.muted}>{t("common.loading")}</p>
          </Show>
        }
      >
        <Card as="form" onSubmit={onSubmit}>
          <label>
            {t("itemForm.name")}
            <input
              required
              ref={setNameInput}
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
            />
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
          <Check>
            <input
              type="checkbox"
              checked={notWanted()}
              onChange={(e) => setNotWanted(e.currentTarget.checked)}
            />
            {t("itemForm.notWanted")}
          </Check>
          <div class={`${u.row} ${styles.priceFields}`}>
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
              <Select value={currency()} onChange={(e) => setCurrency(e.currentTarget.value)}>
                <For each={currencyOptions()}>
                  {(code) => (
                    <option value={code} selected={code === currency()}>
                      {code}
                    </option>
                  )}
                </For>
              </Select>
            </label>
          </div>
          <fieldset>
            <legend>{t("itemForm.visibility")}</legend>
            <Check>
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "all"}
                onChange={() => setVisibility("all")}
              />
              {t("itemForm.allGroups")}
            </Check>
            <Check>
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "some"}
                onChange={() => setVisibility("some")}
              />
              {t("itemForm.selectedGroups")}
            </Check>
            <Show when={visibility() === "some"}>
              <div class={u.indent}>
                <For
                  each={profile()?.groups}
                  fallback={
                    <p class={`${u.muted} ${u.small}`}>
                      {isReady(profile) ? t("itemForm.noGroups") : t("common.loading")}
                    </p>
                  }
                >
                  {(group) => (
                    <Check>
                      <input
                        type="checkbox"
                        checked={groupIds().includes(group.id)}
                        onChange={(e) => toggleGroup(group.id, e.currentTarget.checked)}
                      />
                      {group.name}
                    </Check>
                  )}
                </For>
              </div>
            </Show>
            <Check>
              <input
                type="radio"
                name="visibility"
                checked={visibility() === "none"}
                onChange={() => setVisibility("none")}
              />
              {t("itemForm.noGroupsOption")}
            </Check>
          </fieldset>
          <button type="submit" disabled={busy()}>
            {busy() ? t("common.saving") : t("common.save")}
          </button>
          <Show when={!params.itemId}>
            <Button variant="secondary" type="submit" data-another disabled={busy()}>
              {t("itemForm.saveAndAnother")}
            </Button>
          </Show>
          <Button variant="secondary" onClick={() => history.back()}>
            {t("common.cancel")}
          </Button>
          <Show when={error()}>
            <p class={u.error}>{error()}</p>
          </Show>
          <Show when={savedName()}>
            <p class={u.muted} role="status">
              {t("itemForm.savedAnother", { name: savedName()! })}
            </p>
          </Show>
        </Card>
      </Show>
    </>
  );
}
