import { A } from "@solidjs/router";
import type { JSX } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { fn } from "storybook/test";
import { Avatar } from "../components/Avatar.tsx";
import { BulkActions } from "../components/BulkActions.tsx";
import { CategoryChips } from "../components/CategoryChips.tsx";
import { CurrencySelect } from "../components/CurrencySelect.tsx";
import { FollowList } from "../components/FollowList.tsx";
import { GroupCard } from "../components/GroupCard.tsx";
import { InstallBanner } from "../components/InstallBanner.tsx";
import { ItemCard } from "../components/ItemCard.tsx";
import { NewGroupForm } from "../components/NewGroupForm.tsx";
import { ListMenu } from "../components/ListMenu.tsx";
import { LanguageSelect } from "../components/LanguageSelect.tsx";
import { ListOrderSelect } from "../components/ListOrderSelect.tsx";
import { Occasions } from "../components/Occasions.tsx";
import { ParentSelect } from "../components/ParentSelect.tsx";
import { QuickAdd } from "../components/QuickAdd.tsx";
import { TabBar } from "../components/TabBar.tsx";
import type { Member } from "../lib/api/groups.ts";
import type { Item } from "../lib/api/items.ts";
import type { Occasion } from "../lib/api/occasions.ts";
import { suggestCategories } from "../lib/categories.ts";
import { t } from "../lib/i18n.ts";
import type { AccountId, GroupId, ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import { Select } from "../components/Select.tsx";
import u from "../utilities.module.css";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Check } from "../components/Check.tsx";
import { Chip } from "../components/Chip.tsx";
import { Person } from "../components/Person.tsx";
import { Popover } from "../components/Popover.tsx";
import childStyles from "../components/GroupChildren.module.css";
import homeStyles from "../pages/Home.module.css";
import itemFormStyles from "../pages/ItemForm.module.css";
import loginStyles from "../pages/Login.module.css";
import wishListStyles from "../pages/WishList.module.css";

/**
 * Whole screens put together from the components, with sample data, to judge the design as the
 * app shows it: the phone width with its bottom tabs, and (Viewport toolbar) the desktop sidebar.
 * The real pages need Supabase, so these only mirror their layout.
 */
const meta = {
  title: "Foundations/Screens",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const me = "me" as ProfileId;
const today = "2026-10-21";

/** Same frame as the app's #root: content, then the tab bar. */
const Screen = (props: { children: JSX.Element; tabs?: boolean; banner?: JSX.Element }) => (
  <div id="root">
    {props.banner}
    <main class="page">{props.children}</main>
    {props.tabs === false ? null : <TabBar myProfileId={me} />}
  </div>
);

const member = (id: string, name: string, role: Member["role"], child = false): Member => ({
  profile_id: id as ProfileId,
  role,
  profiles: {
    id: id as ProfileId,
    display_name: name,
    account_id: child ? null : (`account-${id}` as AccountId),
  },
});

const family = {
  id: "group-1" as GroupId,
  name: "Family",
  group_members: [
    member("me", "Orjan", "member"),
    member("anna", "Anna", "manager"),
    member("lucas", "Lucas", "member", true),
    member("bert", "Bert", "member"),
  ],
};
const bookClub = {
  id: "group-2" as GroupId,
  name: "Book club",
  group_members: [member("me", "Orjan", "manager"), member("eva", "Eva", "member")],
};
const annasBirthday: Occasion = {
  id: "o1" as OccasionId,
  group_id: family.id,
  name: "Anna's birthday",
  date: "2026-11-02",
};

const item = (n: number, name: string, price: number | null, category: string | null): Item => ({
  id: `item-${n}` as ItemId,
  profile_id: "anna" as ProfileId,
  name,
  url: null,
  category,
  visible_in_all_groups: true,
  not_wanted: false,
  item_groups: [],
  price,
  price_currency: price === null ? null : n % 3 === 0 ? "EUR" : n % 3 === 1 ? "USD" : "GBP",
});

const card = (
  i: Item,
  purchase: "hidden" | "available" | "mine" | "someone",
  extra: { canEdit?: boolean; boughtFor?: string } = {},
) => (
  <ItemCard
    item={i}
    purchase={purchase}
    canEdit={extra.canEdit ?? false}
    groupNames={[]}
    boughtFor={extra.boughtFor}
    onBuy={fn()}
    onUndo={fn()}
    onRemove={fn()}
  />
);

const newGroupForm = <NewGroupForm card inline onCreate={fn(async () => {})} />;

/** The groups page header once there is a group: "+" on phones, a button with a popover on wide screens. */
const AddGroupHeader = (props: { open?: boolean }) => (
  <div class={u.row}>
    <h1>{t("home.title")}</h1>
    <A class={homeStyles.addLink} href="/groups/new" aria-label={t("home.addGroup")}>
      +
    </A>
    <button type="button" class={homeStyles.addButton} popovertarget="new-group-popover">
      {t("home.addGroup")}
    </button>
    <Popover
      id="new-group-popover"
      anchor="--add-group"
      ref={(el) => {
        if (props.open) queueMicrotask(() => el.showPopover());
      }}
    >
      <NewGroupForm onCreate={fn(async () => {})} />
    </Popover>
  </div>
);

export const Home: Story = {
  render: () => (
    <Screen>
      <AddGroupHeader />
      <GroupCard group={family} myProfileId={me} nextOccasion={annasBirthday} today={today} />
      <GroupCard group={bookClub} myProfileId={me} today={today} />
    </Screen>
  ),
};

export const HomeEmpty: Story = {
  render: () => (
    <Screen>
      <h1>{t("home.title")}</h1>
      <p class={u.muted}>You're not in a group yet. Create one, or open an invite link.</p>
      {newGroupForm}
    </Screen>
  ),
};

/** Someone else's list: what is still open, what you bought, what someone else bought. */
export const OtherList: Story = {
  render: () => (
    <Screen>
      <div class={u.row}>
        <div class={wishListStyles.title}>
          <Avatar id="anna" name="Anna" size="lg" />
          <h1>Anna's list</h1>
          <FollowList
            name="Anna"
            until={null}
            suggestedUntil="2026-11-02"
            suggestedOccasion="Anna's birthday"
            today={today}
            busy={false}
            onFollow={fn()}
            onUnfollow={fn()}
          />
        </div>
      </div>
      <ListOrderSelect value="category" showBought onChange={fn()} />
      <section class={u.stack}>
        <h2>Kitchen</h2>
        <ul class={`${u.list} ${u.cards}`}>
          {card(item(1, "Cast iron pan", 62.5, "Kitchen"), "someone")}
          {card(item(2, "Pour-over coffee set", 38, "Kitchen"), "available")}
        </ul>
      </section>
      <section class={u.stack}>
        <h2>Toys</h2>
        <ul class={`${u.list} ${u.cards}`}>
          {card(item(3, "LEGO Botanical bonsai tree", 49.99, "Toys"), "available")}
          {card(item(4, "Merino scarf, grey", 35, "Toys"), "mine", {
            boughtFor: "Anna's birthday",
          })}
        </ul>
      </section>
    </Screen>
  ),
};

export const OwnList: Story = {
  render: () => (
    <Screen>
      <div class={u.row}>
        <h1>My list</h1>
      </div>
      <div class={u.row}>
        <Button variant="secondary" size="small">
          Select
        </Button>
        <ListOrderSelect value="added" showBought={false} onChange={fn()} />
      </div>
      <ul class={`${u.list} ${u.cards}`}>
        {card(item(5, "Trail running shoes", 129.95, "Sport"), "hidden", { canEdit: true })}
        {card(item(6, "Sourdough starter kit", null, null), "hidden", { canEdit: true })}
      </ul>
      <QuickAdd
        initiallyOpen
        pending={[]}
        retrying={false}
        groups={[
          { id: family.id, name: "Family" },
          { id: bookClub.id, name: "Book club" },
        ]}
        onAdd={fn()}
        onCancel={fn()}
        onOpenForm={fn()}
      />
    </Screen>
  ),
};

export const Settings: Story = {
  render: () => (
    <Screen>
      <h1>{t("account.title")}</h1>
      <Card as="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          {t("account.yourName")}
          <input value="Orjan" />
        </label>
        <button type="submit">{t("account.saveName")}</button>
      </Card>
      <Card>
        <LanguageSelect value="en" onChange={fn()} />
        <CurrencySelect value="EUR" onChange={fn()} />
      </Card>
      <Button variant="secondary">{t("account.signOut")}</Button>
    </Screen>
  ),
};

export const Login: Story = {
  render: () => (
    <div id="root">
      <Card as="main" class={`${u.center} ${loginStyles.login}`}>
        <img class={loginStyles.mark} src="/favicon.svg" alt="" />
        <h1>Wishlister</h1>
        <p class={u.muted}>Share wishlists with family and friends.</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            Email
            <input type="email" />
          </label>
          <button type="submit">Send code</button>
        </form>
        <LanguageSelect value="en" onChange={fn()} />
      </Card>
    </div>
  ),
};

const occasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: family.id,
  name,
  date,
});
const occasions = [
  annasBirthday,
  occasion("o2", "Sinterklaas 2026", "2026-12-06"),
  occasion("o3", "Christmas 2026", "2026-12-25"),
  occasion("o4", "Christmas 2025", "2025-12-25"),
];

const groupGroups = [
  { id: family.id, name: "Family" },
  { id: bookClub.id, name: "Book club" },
];

/** Same fixtures as the other list stories, but with the states the list page can be in. */
export const ListEmptyOwn: Story = {
  render: () => (
    <Screen>
      <div class={u.row}>
        <h1>{t("wishlist.mine")}</h1>
      </div>
      <p class={u.muted}>{t("wishlist.emptyOwn")}</p>
      <QuickAdd
        initiallyOpen
        pending={[]}
        retrying={false}
        groups={groupGroups}
        onAdd={fn()}
        onCancel={fn()}
        onOpenForm={fn()}
      />
    </Screen>
  ),
};

export const ListEmptyOther: Story = {
  render: () => (
    <Screen>
      <h1>Anna's list</h1>
      <p class={u.muted}>{t("wishlist.empty")}</p>
    </Screen>
  ),
};

export const ListLoading: Story = {
  render: () => (
    <Screen>
      <h1>{t("wishlist.fallbackTitle")}</h1>
      <p class={u.muted}>{t("common.loading")}</p>
    </Screen>
  ),
};

export const ListError: Story = {
  render: () => (
    <Screen>
      <h1>{t("wishlist.fallbackTitle")}</h1>
      <p class={u.error}>{t("wishlist.unavailable")}</p>
    </Screen>
  ),
};

/** Own list with a private item, one waiting to save, one "please don't buy" and an error. */
export const OwnListStates: Story = {
  render: () => (
    <Screen>
      <h1>{t("wishlist.mine")}</h1>
      <p class={u.error}>Could not save the item. Try again.</p>
      <ul class={`${u.list} ${u.cards}`}>
        <ItemCard
          item={{
            ...item(7, "Noise-cancelling headphones", 279, "Music"),
            visible_in_all_groups: false,
          }}
          purchase="hidden"
          canEdit
          groupNames={[]}
          onBuy={fn()}
          onUndo={fn()}
          onRemove={fn()}
        />
        <ItemCard
          item={{ ...item(8, "Board game: Wingspan", 49, "Games"), visible_in_all_groups: false }}
          purchase="hidden"
          canEdit
          groupNames={["Family"]}
          onBuy={fn()}
          onUndo={fn()}
          onRemove={fn()}
        />
      </ul>
      <section class={u.stack}>
        <h2>{t("listOrder.notWanted")}</h2>
        <ul class={`${u.list} ${u.cards}`}>
          <ItemCard
            item={{ ...item(9, "Mugs", null, null), not_wanted: true }}
            purchase="hidden"
            canEdit
            groupNames={[]}
            onBuy={fn()}
            onUndo={fn()}
            onRemove={fn()}
          />
        </ul>
      </section>
      <QuickAdd
        initiallyOpen
        pending={[{ name: "Sourdough starter kit", groups: "all" } as never]}
        retrying
        groups={groupGroups}
        onAdd={fn()}
        onCancel={fn()}
        onOpenForm={fn()}
      />
    </Screen>
  ),
};

/** Picking items for a bulk action. */
export const ListSelecting: Story = {
  render: () => (
    <Screen>
      <div class={u.row}>
        <h1>{t("wishlist.mine")}</h1>
      </div>
      <ul class={`${u.list} ${u.cards}`}>
        <ItemCard
          item={item(5, "Trail running shoes", 129.95, "Sport")}
          purchase="hidden"
          canEdit
          groupNames={[]}
          selecting
          selected
          onBuy={fn()}
          onUndo={fn()}
          onRemove={fn()}
        />
        <ItemCard
          item={item(6, "Sourdough starter kit", 24, "Kitchen")}
          purchase="hidden"
          canEdit
          groupNames={[]}
          selecting
          onBuy={fn()}
          onUndo={fn()}
          onRemove={fn()}
        />
      </ul>
      <BulkActions
        selected={1}
        total={2}
        groups={groupGroups}
        suggestCategories={(typed: string) =>
          suggestCategories(["Sport", "Kitchen"], ["Books", "Toys"], typed)
        }
        busy={false}
        onSelectAll={fn()}
        onSelectNone={fn()}
        onSetCategory={fn()}
        onSetGroups={fn()}
        onDelete={fn()}
        onDone={fn()}
      />
    </Screen>
  ),
};

export const HomeWithInstallBanner: Story = {
  render: () => (
    <Screen banner={<InstallBanner mode="prompt" onInstall={fn()} onDismiss={fn()} />}>
      <AddGroupHeader />
      <GroupCard group={family} myProfileId={me} nextOccasion={annasBirthday} today={today} />
    </Screen>
  ),
};

export const HomeOccasionToday: Story = {
  render: () => (
    <Screen>
      <AddGroupHeader />
      <GroupCard
        group={family}
        myProfileId={me}
        nextOccasion={{ ...annasBirthday, date: today }}
        today={today}
      />
      <GroupCard
        group={{ ...bookClub, name: "Colleagues" }}
        myProfileId={me}
        nextOccasion={{ ...annasBirthday, name: "Team lunch", date: "2026-10-22" }}
        today={today}
      />
    </Screen>
  ),
};

export const HomeLoadFailed: Story = {
  render: () => (
    <Screen>
      <h1>{t("home.title")}</h1>
      <p class={u.error}>{t("home.loadFailed", { message: "Failed to fetch" })}</p>
    </Screen>
  ),
};

export const ItemFormNew: Story = {
  render: () => (
    <Screen>
      <h1>{t("wishlist.addItem")}</h1>
      <ItemFormMock />
    </Screen>
  ),
};

export const ItemFormEditSelectedGroups: Story = {
  render: () => (
    <Screen>
      <h1>{t("common.edit")}</h1>
      <ItemFormMock editing />
    </Screen>
  ),
};

function ItemFormMock(props: { editing?: boolean }) {
  return (
    <Card as="form" onSubmit={(e) => e.preventDefault()}>
      <label>
        {t("itemForm.name")}
        <input required value={props.editing ? "LEGO Botanical bonsai tree" : ""} />
      </label>
      <label>
        {t("itemForm.link")}
        <input
          type="url"
          placeholder="https://"
          value={props.editing ? "https://www.lego.com/bonsai" : ""}
        />
      </label>
      <label>
        {t("itemForm.category")}
        <input value={props.editing ? "Toys" : ""} />
      </label>
      <CategoryChips categories={["Books", "Clothes", "Toys", "Games"]} onPick={fn()} />
      <Check>
        <input type="checkbox" />
        {t("itemForm.notWanted")}
      </Check>
      <div class={`${u.row} ${itemFormStyles.priceFields}`}>
        <label>
          {t("itemForm.price")}
          <input inputmode="decimal" value={props.editing ? "49.99" : ""} />
        </label>
        <label>
          {t("itemForm.currency")}
          <Select>
            <option>EUR</option>
            <option>USD</option>
          </Select>
        </label>
      </div>
      <fieldset>
        <legend>{t("itemForm.visibility")}</legend>
        <Check>
          <input type="radio" name="visibility" checked={!props.editing} />
          {t("itemForm.allGroups")}
        </Check>
        <Check>
          <input type="radio" name="visibility" checked={props.editing} />
          {t("itemForm.selectedGroups")}
        </Check>
        {props.editing ? (
          <div class={u.indent}>
            <Check>
              <input type="checkbox" checked /> Family
            </Check>
            <Check>
              <input type="checkbox" /> Book club
            </Check>
          </div>
        ) : null}
        <Check>
          <input type="radio" name="visibility" />
          {t("itemForm.noGroupsOption")}
        </Check>
      </fieldset>
      <button type="submit">{t("common.save")}</button>
      <Button variant="secondary">{t("common.cancel")}</Button>
    </Card>
  );
}

export const ItemFormError: Story = {
  render: () => (
    <Screen>
      <h1>{t("wishlist.addItem")}</h1>
      <Card as="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          {t("itemForm.name")}
          <input required value="Trail running shoes" />
        </label>
        <button type="submit" disabled>
          {t("common.saving")}
        </button>
        <p class={u.error}>Could not save the item.</p>
      </Card>
    </Screen>
  ),
};

function GroupSettingsMock(props: { manager: boolean }) {
  return (
    <>
      <h1>Family</h1>
      <Card>
        <h2>{t("group.members")}</h2>
        <ul class={u.list}>
          <li class={u.listRow}>
            <Person id="me" name="Orjan">
              Orjan{t("common.you")}
            </Person>
            {props.manager ? (
              <Chip>{t("roles.manager")}</Chip>
            ) : (
              <Select>
                <option>{t("roles.member")}</option>
                <option>{t("roles.guardian")}</option>
              </Select>
            )}
          </li>
          <li class={u.listRow}>
            <Person id="anna" name="Anna">
              Anna
            </Person>
            {props.manager ? (
              <span class={u.row}>
                <Select>
                  <option>{t("roles.manager")}</option>
                </Select>
                <Button variant="link" danger>
                  {t("common.remove")}
                </Button>
              </span>
            ) : (
              <Chip>{t("roles.manager")}</Chip>
            )}
          </li>
          <li class={u.listRow}>
            <Person id="bert" name="Bert">
              Bert
            </Person>
            {props.manager ? (
              <span class={u.row}>
                <Select>
                  <option>{t("roles.member")}</option>
                </Select>
                <Button variant="link" danger>
                  {t("common.remove")}
                </Button>
              </span>
            ) : (
              <Chip>{t("roles.member")}</Chip>
            )}
          </li>
        </ul>
        <p class={`${u.muted} ${u.small}`}>{t("group.guardianHelp")}</p>
        {props.manager ? (
          <>
            <h3>{t("group.pendingInvites")}</h3>
            <ul class={u.list}>
              <li class={u.listRow}>
                <span class={`${u.muted} ${u.truncate}`}>carla.janssens@example.com</span>
                <span class={u.row}>
                  <Button variant="link">{t("group.emailInvite")}</Button>
                  <Button variant="link" danger>
                    {t("common.cancel")}
                  </Button>
                </span>
              </li>
            </ul>
            <form onSubmit={(e) => e.preventDefault()}>
              <label>
                {t("group.inviteByEmail")}
                <input type="email" />
              </label>
              <button type="submit">{t("group.invite")}</button>
            </form>
            <h3>{t("group.inviteLink")}</h3>
            <p class={`${u.muted} ${u.small}`}>{t("group.inviteLinkHelp")}</p>
            <div class={u.row}>
              <button type="button">{t("group.shareLink")}</button>
              <Button variant="secondary">{t("group.newLink")}</Button>
            </div>
          </>
        ) : null}
      </Card>
      <Card>
        <h2>{t("group.children")}</h2>
        <p class={`${u.muted} ${u.small}`}>{t("group.childrenHelp")}</p>
        <ul class={u.list}>
          <li class={childStyles.child}>
            <div class={u.listRow}>
              <span>Lucas</span>
              <span class={u.row}>
                <A class={u.link} href="/children/lucas">
                  {t("child.editProfile")}
                </A>
                <Button variant="link" danger>
                  {t("common.remove")}
                </Button>
              </span>
            </div>
          </li>
        </ul>
        {props.manager ? (
          <form onSubmit={(e) => e.preventDefault()}>
            <label>
              {t("group.addNewChild")}
              <input required placeholder={t("group.childName")} />
            </label>
            <label>
              {t("group.parent")}
              <ParentSelect
                name="parent"
                options={[
                  { id: "me" as ProfileId, name: "Orjan (you)" },
                  { id: "anna" as ProfileId, name: "Anna" },
                ]}
                value={"me" as ProfileId}
                onChange={fn()}
              />
            </label>
            <button type="submit">{t("group.addChild")}</button>
          </form>
        ) : null}
      </Card>
      <Occasions
        occasions={occasions}
        today={today}
        canEdit={props.manager}
        onAdd={fn(async () => true)}
        onUpdate={fn(async () => true)}
        onDelete={fn()}
      />
      {props.manager ? (
        <Card as="form" onSubmit={(e) => e.preventDefault()}>
          <label>
            {t("group.groupName")}
            <input required value="Family" />
          </label>
          <button type="submit">{t("group.rename")}</button>
        </Card>
      ) : null}
      <div class={u.stack}>
        <Button variant="secondary">{t("group.leave")}</Button>
        {props.manager ? (
          <Button variant="secondary" danger>
            {t("group.deleteGroup")}
          </Button>
        ) : null}
      </div>
    </>
  );
}

export const GroupSettingsAsManager: Story = {
  render: () => (
    <Screen>
      <GroupSettingsMock manager />
    </Screen>
  ),
};

export const GroupSettingsAsMember: Story = {
  render: () => (
    <Screen>
      <GroupSettingsMock manager={false} />
    </Screen>
  ),
};

export const GroupLeaveHandOver: Story = {
  render: () => (
    <Screen>
      <h1>Family</h1>
      <Card as="div">
        <label>
          {t("group.chooseSuccessor", { group: "Family" })}
          <Select>
            <option value="" disabled selected>
              {t("group.chooseMember")}
            </option>
            <option>Anna</option>
          </Select>
        </label>
        <button type="button" disabled>
          {t("group.handOverAndLeave")}
        </button>
        <Button variant="secondary">{t("group.stay")}</Button>
      </Card>
    </Screen>
  ),
};

/** A parent also manages their children here: open a list, or delete the child. */
export const SettingsWithChildren: Story = {
  render: () => (
    <Screen>
      <h1>{t("account.title")}</h1>
      <Card as="form" onSubmit={(e) => e.preventDefault()}>
        <label>
          {t("account.yourName")}
          <input required value="Orjan" />
        </label>
        <button type="submit">{t("account.saveName")}</button>
        <p class={u.muted}>{t("account.saved")}</p>
      </Card>
      <Card>
        <LanguageSelect value="en" onChange={fn()} />
        <CurrencySelect value="EUR" onChange={fn()} />
      </Card>
      <Card>
        <h2>{t("account.children")}</h2>
        <p class={`${u.muted} ${u.small}`}>{t("account.childrenHelp")}</p>
        <ul class={u.list}>
          {["Lucas", "Mila"].map((name) => (
            <li class={u.listRow}>
              <Person id={name.toLowerCase()} name={name}>
                {name}
              </Person>
              <A class={u.link} href={`/children/${name}`}>
                {t("child.editProfile")}
              </A>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            {t("group.addNewChild")}
            <input required placeholder={t("group.childName")} />
          </label>
          <button type="submit">{t("group.addChild")}</button>
        </form>
      </Card>
      <Button variant="secondary">{t("account.signOut")}</Button>
    </Screen>
  ),
};

export const LoginCode: Story = {
  render: () => (
    <div id="root">
      <Card as="main" class={`${u.center} ${loginStyles.login}`}>
        <h1>Wishlister</h1>
        <p>{t("login.checkInbox", { email: "orjan@example.com" })}</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            {t("login.code")}
            <input class={loginStyles.codeInput} inputmode="numeric" value="482915" />
          </label>
          <button type="submit">{t("login.signIn")}</button>
          <Button variant="secondary">{t("login.otherEmail")}</Button>
        </form>
        <p class={u.error} role="alert">
          Token has expired or is invalid
        </p>
        <LanguageSelect value="en" onChange={fn()} />
      </Card>
    </div>
  ),
};

export const JoinInvited: Story = {
  render: () => (
    <Screen>
      <h1>{t("join.title")}</h1>
      <Card>
        <p>{t("join.invited", { group: "Family" })}</p>
        <button type="button">{t("join.join", { group: "Family" })}</button>
      </Card>
    </Screen>
  ),
};

export const JoinAlreadyMember: Story = {
  render: () => (
    <Screen>
      <h1>{t("join.title")}</h1>
      <Card>
        <p>{t("join.alreadyIn", { group: "Family" })}</p>
        <A class={u.link} href="/groups/group-1">
          {t("join.open", { group: "Family" })}
        </A>
      </Card>
    </Screen>
  ),
};

export const JoinExpired: Story = {
  render: () => (
    <Screen>
      <h1>{t("join.title")}</h1>
      <p class={u.muted}>{t("join.expired")}</p>
      <A class={u.link} href="/">
        {t("join.toGroups")}
      </A>
    </Screen>
  ),
};

export const UnfollowDone: Story = {
  render: () => (
    <Screen tabs={false}>
      <h1>{t("unfollow.title")}</h1>
      <p>{t("unfollow.done", { name: "Anna" })}</p>
      <A class={u.link} href="/">
        {t("unfollow.toApp")}
      </A>
    </Screen>
  ),
};

/** Wide screens: the popover open under "Add group". Pick a desktop viewport to see it. */
export const HomeAddGroupPopover: Story = {
  render: () => (
    <Screen>
      <AddGroupHeader open />
      <GroupCard group={family} myProfileId={me} nextOccasion={annasBirthday} today={today} />
      <GroupCard group={bookClub} myProfileId={me} today={today} />
    </Screen>
  ),
};

/** Phones: "+" opens this page. */
export const NewGroupPage: Story = {
  render: () => (
    <Screen>
      <h1>{t("home.newGroup")}</h1>
      <NewGroupForm card onCreate={fn(async () => {})} />
    </Screen>
  ),
};

/** A parent's own list: a dropdown jumps to a child's list. */
export const OwnListAsParent: Story = {
  render: () => (
    <Screen>
      <div class={u.row}>
        <div class={wishListStyles.title}>
          <Avatar id="me" name="Orjan" size="lg" />
          <h1>{t("wishlist.mine")}</h1>
          <ListMenu
            value={me}
            options={[
              { id: me, name: t("nav.myList"), person: "Orjan" },
              {
                id: "lucas" as ProfileId,
                name: t("account.childWishlist", { name: "Lucas" }),
                person: "Lucas",
              },
              {
                id: "mila" as ProfileId,
                name: t("account.childWishlist", { name: "Mila" }),
                person: "Mila",
              },
            ]}
          />
        </div>
      </div>
      <div class={u.row}>
        <Button variant="secondary" size="small">
          Select
        </Button>
        <ListOrderSelect value="added" showBought={false} onChange={fn()} />
      </div>
      <ul class={`${u.list} ${u.cards}`}>
        {card(item(5, "Trail running shoes", 129.95, "Sport"), "hidden", { canEdit: true })}
      </ul>
    </Screen>
  ),
};

/** The smallest phones: the tab bar still fits all three tabs. */
export const HomeSmallestPhone: Story = {
  ...Home,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
