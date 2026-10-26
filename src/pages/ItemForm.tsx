import { useLocation, useNavigate, useParams } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  createUniqueId,
  For,
  on,
  onCleanup,
  Show,
} from "solid-js";
import { CategoryChips } from "../components/CategoryChips.tsx";
import { addItem, getCategories, getItem, updateItem } from "../lib/api/items.ts";
import { getPageInfo } from "../lib/api/pageInfo.ts";
import { getProfileDetails } from "../lib/api/profiles.ts";
import { starterCategoryKeys, suggestCategories } from "../lib/categories.ts";
import { currencies, displayCurrency, parsePriceInput } from "../lib/currency.ts";
import { locale, t } from "../lib/i18n.ts";
import type { GroupId, ItemId, ProfileId } from "../lib/ids.ts";
import type { ItemDraft } from "../lib/itemDraft.ts";
import { splitLink } from "../lib/links.ts";
import { splitNotWanted } from "../lib/notWanted.ts";
import { fillFromPage, lookupUrl } from "../lib/pageFill.ts";
import { isReady } from "../lib/resource.ts";
import { Select } from "../components/Select.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Check } from "../components/Check.tsx";
import styles from "./ItemForm.module.css";
import { announce, focusSoon, usePageTitle } from "../lib/a11y.ts";
import { ItemThumbnail } from "../components/ItemPicture.tsx";

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
  const [description, setDescription] = createSignal("");
  const descriptionHint = createUniqueId();
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
  const [linkInput, setLinkInput] = createSignal<HTMLInputElement>();

  // Looking up the linked page, like quick add does: its picture, its price and (only
  // when no name was typed yet) its title. `lookedUp` is the last link looked up, so the
  // same link isn't fetched twice; `filledPrice` the price text a lookup put in, which a
  // later lookup may replace (a price typed by hand is never replaced).
  const [imageUrl, setImageUrl] = createSignal<string | null>();
  const [lookup, setLookup] = createSignal<"idle" | "busy" | "filled" | "image" | "nothing">(
    "idle",
  );
  let lookedUp: string | null = null;
  let filledPrice: string | null = null;
  let lookupTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(lookupTimer));

  async function lookUpLink() {
    clearTimeout(lookupTimer);
    const link = lookupUrl(url());
    if (!link || link === lookedUp) return;
    lookedUp = link;
    setLookup("busy");
    const page = await getPageInfo(link);
    // The link was changed again while this one was being read.
    if (lookupUrl(url()) !== link) return;
    const changes = fillFromPage(
      { name: name(), price: price(), currency: currency() },
      page,
      filledPrice,
      locale(),
    );
    if (changes.name !== undefined) setName(changes.name);
    if (changes.price !== undefined) {
      setPrice(changes.price);
      filledPrice = changes.price;
    }
    if (changes.currency !== undefined) setCurrency(changes.currency);
    // A new link's picture replaces the old link's, even when it has none.
    setImageUrl(page.image);
    const filled = page.image || Object.keys(changes).length > 0;
    setLookup(page.isImage ? "image" : filled ? "filled" : "nothing");
  }

  // Not the picture you want: saved without one. Changing the link looks up a new one.
  function removePicture() {
    setImageUrl(null);
    announce(t("itemForm.pictureRemoved"));
    // The button is gone; back to the link it came from.
    focusSoon(linkInput);
  }

  // Typing or pasting: look up once the link has stood still for a moment.
  function onUrlInput(text: string) {
    setUrl(text);
    setLookup("idle");
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(lookUpLink, 800);
  }

  // When editing, copy the loaded item into the form once.
  createEffect(
    on(item, (loaded) => {
      if (!loaded) return;
      setName(loaded.name);
      setUrl(loaded.url ?? "");
      // Opening an item to edit it doesn't look up its link again; changing the link does.
      lookedUp = lookupUrl(loaded.url ?? "");
      setImageUrl(loaded.image_url);
      setCategory(loaded.category ?? "");
      setDescription(loaded.description ?? "");
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
    if (link) void lookUpLink();
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
      description: description(),
      visible_in_all_groups: visibility() === "all",
      not_wanted: notWanted(),
      groupIds: visibility() === "some" ? groupIds() : [],
      price: amount === null ? null : { amount, currency: currency() },
      // The picture belongs to the link: no link, no picture.
      imageUrl: url().trim() ? imageUrl() : null,
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
        setDescription("");
        setImageUrl(undefined);
        setLookup("idle");
        lookedUp = null;
        filledPrice = null;
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

  usePageTitle(() => (params.itemId ? t("itemForm.editTitle") : t("itemForm.addTitle")));

  return (
    <>
      <h1>{params.itemId ? t("itemForm.editTitle") : t("itemForm.addTitle")}</h1>
      <Show when={item.error}>
        <p class={u.error} role="alert">
          {t("itemForm.loadFailed", { message: item.error.message })}
        </p>
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
              ref={setLinkInput}
              type="url"
              inputmode="url"
              placeholder="https://"
              value={url()}
              onInput={(e) => onUrlInput(e.currentTarget.value)}
              onChange={() => void lookUpLink()}
            />
          </label>
          <p class={`${u.muted} ${u.small}`} role="status">
            <Show when={lookup() === "busy"}>{t("itemForm.lookingUp")}</Show>
            <Show when={lookup() === "filled"}>{t("itemForm.filledFromLink")}</Show>
            <Show when={lookup() === "image"}>{t("itemForm.imageLink")}</Show>
            <Show when={lookup() === "nothing"}>{t("itemForm.nothingFromLink")}</Show>
          </p>
          <Show when={url().trim() && imageUrl()}>
            {(src) => (
              <div class={styles.picture}>
                <ItemThumbnail src={src()} />
                <div class={`${u.stack} ${u.smallGap} ${styles.pictureText}`}>
                  <span class={`${u.muted} ${u.small}`}>{t("itemForm.pictureFromLink")}</span>
                  <Button variant="link" danger onClick={removePicture}>
                    {t("itemForm.removePicture")}
                  </Button>
                </div>
              </div>
            )}
          </Show>
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
          <CategoryChips
            categories={chips()}
            onPick={(picked) => {
              setCategory(picked);
              // The picked chip may drop out of the suggestions: back to the field.
              focusSoon(() =>
                document.querySelector<HTMLElement>("input[list=category-suggestions]"),
              );
            }}
          />
          <label>
            {t("itemForm.description")}
            <textarea
              rows={4}
              maxLength={1000}
              aria-describedby={descriptionHint}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
          </label>
          <p id={descriptionHint} class={`${u.muted} ${u.small} ${styles.hint}`}>
            {t("itemForm.descriptionHint")}
          </p>
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
            <p class={u.error} role="alert">
              {error()}
            </p>
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
