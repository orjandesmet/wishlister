import { createMemoryHistory, MemoryRouter } from "@solidjs/router";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { AppRoot, AppRoutes } from "../App.tsx";
import { getParents } from "../lib/api/children.ts";
import {
  getFollowUntil,
  getMyFollows,
  unfollowByToken,
  type FollowedList,
} from "../lib/api/follows.ts";
import {
  getGroup,
  getInvites,
  getJoinPreview,
  getMyGroups,
  type Group,
  type JoinPreview,
  type Member,
} from "../lib/api/groups.ts";
import {
  addItem,
  addQuickItems,
  getCategories,
  getItem,
  getItems,
  type Item,
} from "../lib/api/items.ts";
import {
  getNextSharedOccasion,
  getOccasions,
  getUpcomingOccasions,
  type Occasion,
} from "../lib/api/occasions.ts";
import {
  getAdultProfiles,
  getManagedProfiles,
  getMyProfile,
  getProfileDetails,
  type Profile,
  type ProfileDetails,
} from "../lib/api/profiles.ts";
import { getPurchaseOccasions, getPurchases, type Purchase } from "../lib/api/purchases.ts";
import { setMockOtpError, setMockSession } from "../lib/__mocks__/supabase.ts";
import { t } from "../lib/i18n.ts";
import type { AccountId, GroupId, ItemId, OccasionId, ProfileId } from "../lib/ids.ts";
import { installOffer } from "../lib/install.ts";
import { today } from "../lib/occasions.ts";
import { bonsaiPicture, scarfPicture } from "./samplePictures.ts";

/**
 * The real app at a given address, with sample data: the phone width with its bottom tabs, and
 * (Viewport toolbar) the desktop sidebar. Supabase is mocked (see .storybook/preview.tsx): each
 * story fills `data` in its beforeEach, and a play function clicks through to states a page only
 * reaches after a tap.
 */
const meta = {
  title: "Foundations/Screens",
  parameters: { layout: "fullscreen", router: false },
  beforeEach: () => {
    data = sampleData();
    setMockSession({ accountId: "account-me" });
    setMockOtpError(null);
    localStorage.removeItem("listOrder");
    mocked(today).mockReturnValue(day);
    mocked(installOffer).mockReturnValue(undefined);

    mocked(getMyProfile).mockImplementation(async () => orjan);
    mocked(getManagedProfiles).mockImplementation(async () => data.managed);
    mocked(getAdultProfiles).mockImplementation(async () => data.adults);
    mocked(getProfileDetails).mockImplementation((id) => details(id));
    mocked(getMyGroups).mockImplementation(() => data.groups());
    mocked(getGroup).mockImplementation(async (id) => data.group(id));
    mocked(getInvites).mockImplementation(async () => data.invites);
    mocked(getParents).mockImplementation(async () => data.parents);
    mocked(getJoinPreview).mockImplementation(async () => data.joinPreview);
    mocked(getUpcomingOccasions).mockImplementation(async () => data.occasions);
    mocked(getOccasions).mockImplementation(async () => data.occasions);
    mocked(getNextSharedOccasion).mockImplementation(async () => data.occasions[0] ?? null);
    mocked(getItems).mockImplementation((id) => data.items(id));
    mocked(getItem).mockImplementation(async (id) => {
      const found = Object.values(data.lists)
        .flat()
        .find((i) => i.id === id);
      if (!found) throw new Error("Not found");
      return found;
    });
    mocked(getCategories).mockImplementation(async () => ["Books", "Kitchen", "Sport", "Toys"]);
    mocked(addItem).mockImplementation(() => data.addItem());
    mocked(addQuickItems).mockImplementation(() => data.addQuickItems());
    mocked(getPurchases).mockImplementation(async () => data.purchases);
    mocked(getPurchaseOccasions).mockImplementation(async () => data.occasions.slice(0, 1));
    mocked(getFollowUntil).mockImplementation(async () => null);
    mocked(getMyFollows).mockImplementation(async () => data.follows);
    mocked(unfollowByToken).mockImplementation(async () => "Anna");
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole app, opened at `path`. */
const app = (path: string) => () => {
  const history = createMemoryHistory();
  history.set({ value: path });
  return (
    <div id="root">
      <MemoryRouter history={history} root={AppRoot}>
        <AppRoutes />
      </MemoryRouter>
    </div>
  );
};

const day = "2026-10-21";
const me = "me" as ProfileId;

const profile = (id: string, child = false): Profile => ({
  id: id as ProfileId,
  display_name: id.charAt(0).toUpperCase() + id.slice(1),
  account_id: child ? null : (`account-${id}` as AccountId),
});
// Your own profile is "Orjan", the rest are named after their id.
const orjan: Profile = { ...profile("me"), display_name: "Orjan" };

const member = (p: Profile, role: Member["role"]): Member => ({
  profile_id: p.id,
  role,
  profiles: p,
});

const family: Group = {
  id: "group-1" as GroupId,
  name: "Family",
  group_members: [
    member(orjan, "member"),
    member(profile("anna"), "manager"),
    member(profile("lucas", true), "member"),
    member(profile("bert"), "member"),
  ],
};
const bookClub: Group = {
  id: "group-2" as GroupId,
  name: "Book club",
  group_members: [member(orjan, "manager"), member(profile("eva"), "member")],
};
const groupsOfMine = [
  { id: family.id, name: family.name },
  { id: bookClub.id, name: bookClub.name },
];

const occasion = (id: string, name: string, date: string): Occasion => ({
  id: id as OccasionId,
  group_id: family.id,
  name,
  date,
});
const annasBirthday = occasion("o1", "Anna's birthday", "2026-11-02");

const item = (
  n: number,
  owner: string,
  name: string,
  price: number | null,
  category: string | null,
  extra: Partial<Item> = {},
): Item => ({
  id: `item-${n}` as ItemId,
  profile_id: owner as ProfileId,
  name,
  url: null,
  category,
  visible_in_all_groups: true,
  not_wanted: false,
  item_groups: [],
  price,
  price_currency: price === null ? null : n % 3 === 0 ? "EUR" : n % 3 === 1 ? "USD" : "GBP",
  image_url: null,
  ...extra,
});

const never = <T,>() => new Promise<T>(() => {});

/** What the mocked API answers. Each story starts from this and changes what it needs. */
function sampleData() {
  return {
    groups: async (): Promise<Group[]> => [family, bookClub],
    group: (id: GroupId): Group => (id === bookClub.id ? bookClub : family),
    occasions: [annasBirthday] as Occasion[],
    invites: [] as string[],
    parents: new Map<ProfileId, ProfileId[]>([["lucas" as ProfileId, ["anna" as ProfileId]]]),
    joinPreview: null as JoinPreview | null,
    managed: [] as Profile[],
    adults: [orjan, profile("anna"), profile("bert"), profile("eva")],
    /** Groups each list is shown in, and who manages it. */
    details: {} as Record<string, Partial<ProfileDetails>>,
    lists: {
      me: [
        item(5, "me", "Trail running shoes", 129.95, "Sport"),
        item(6, "me", "Sourdough starter kit", null, null),
      ],
      anna: [
        item(1, "anna", "Cast iron pan", 62.5, "Kitchen"),
        item(2, "anna", "Pour-over coffee set", 38, "Kitchen"),
        item(3, "anna", "LEGO Botanical bonsai tree", 49.99, "Toys", { image_url: bonsaiPicture }),
        item(4, "anna", "Merino scarf, grey", 35, "Toys", { image_url: scarfPicture }),
      ],
    } as Record<string, Item[]>,
    items: (id: ProfileId): Promise<Item[]> => Promise.resolve(data.lists[id] ?? []),
    purchases: [
      { item_id: "item-1" as ItemId, bought_by: "bert" as ProfileId, occasion: null },
      {
        item_id: "item-4" as ItemId,
        bought_by: me,
        occasion: { name: annasBirthday.name },
      },
    ] as Purchase[],
    follows: [] as FollowedList[],
    addItem: async (): Promise<void> => {},
    addQuickItems: async (): Promise<Item[]> => [],
  };
}

let data = sampleData();

async function details(id: ProfileId): Promise<ProfileDetails> {
  const base =
    id === me
      ? orjan
      : profile(
          id,
          data.managed.some((c) => c.id === id),
        );
  return {
    ...base,
    managerIds: data.managed.some((c) => c.id === id) ? [me] : [],
    groups: groupsOfMine,
    ...data.details[id],
  };
}

/**
 * Opens a popover the page has rendered, as tapping its button would. `when` is the media query
 * under which the page uses it as a popover (quick add sits in the page on very wide screens).
 */
const openPopover = (id: string, when = "all") =>
  waitFor(() => {
    const popover = document.getElementById(id);
    if (!popover) throw new Error(`No #${id} yet`);
    if (matchMedia(when).matches) popover.showPopover();
  });
const quickAddIsPopover = "(max-width: 1199px)";

export const Home: Story = { render: app("/") };

export const HomeEmpty: Story = {
  beforeEach: () => {
    data.groups = async () => [];
  },
  render: app("/"),
};

/** Someone else's list: what is still open, what you bought, what someone else bought. */
export const OtherList: Story = {
  beforeEach: () => localStorage.setItem("listOrder", "category"),
  render: app("/lists/anna"),
};

export const OwnList: Story = {
  render: app("/lists/me"),
  play: () => openPopover("quick-add-popover", quickAddIsPopover),
};

/** The list menu with many groups: it scrolls on its own and sits above the quick add button. */
export const ListMenuLong: Story = {
  beforeEach: () => {
    const names = ["anna", "bert", "carla", "dirk", "eva", "fien", "gust", "hanne", "ines"];
    const club = (n: number, name: string): Group => ({
      id: `group-${n}` as GroupId,
      name,
      group_members: [member(orjan, "member"), ...names.map((id) => member(profile(id), "member"))],
    });
    data.groups = async () => [family, club(3, "Colleagues"), club(4, "Football"), bookClub];
  },
  render: app("/lists/me"),
  play: () => openPopover("list-menu"),
};

export const Settings: Story = { render: app("/settings") };

export const Login: Story = {
  beforeEach: () => setMockSession(null),
  render: app("/login"),
};

/** Same fixtures as the other list stories, but with the states the list page can be in. */
export const ListEmptyOwn: Story = {
  beforeEach: () => {
    data.lists.me = [];
  },
  render: app("/lists/me"),
};

export const ListEmptyOther: Story = {
  beforeEach: () => {
    data.lists.anna = [];
  },
  render: app("/lists/anna"),
};

export const ListLoading: Story = {
  beforeEach: () => {
    data.items = () => never();
  },
  render: app("/lists/anna"),
};

export const ListError: Story = {
  beforeEach: () => {
    data.items = () => Promise.reject(new Error("Failed to fetch"));
  },
  render: app("/lists/anna"),
};

/** Own list with a private item, one for some groups, a "please don't buy" and one failing to save. */
export const OwnListStates: Story = {
  beforeEach: () => {
    data.lists.me = [
      item(7, "me", "Noise-cancelling headphones", 279, "Music", { visible_in_all_groups: false }),
      item(8, "me", "Board game: Wingspan", 49, "Games", {
        visible_in_all_groups: false,
        item_groups: [{ group_id: family.id }],
      }),
      item(9, "me", "Mugs", null, null, { not_wanted: true }),
    ];
    data.addQuickItems = () => Promise.reject(new Error("Failed to fetch"));
  },
  render: app("/lists/me"),
  play: async ({ canvasElement }) => {
    await openPopover("quick-add-popover", quickAddIsPopover);
    const field = await within(canvasElement).findByLabelText(t("quickAdd.label"), {
      selector: "input",
    });
    await userEvent.type(field, "Sourdough starter kit{Enter}");
  },
};

/** Picking items for a bulk action. */
export const ListSelecting: Story = {
  render: app("/lists/me"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: t("bulk.select") }));
    await userEvent.click((await canvas.findAllByRole("checkbox"))[0]);
  },
};

export const HomeWithInstallBanner: Story = {
  beforeEach: () => {
    mocked(installOffer).mockReturnValue("prompt");
  },
  render: app("/"),
};

export const HomeOccasionToday: Story = {
  beforeEach: () => {
    data.groups = async () => [family, { ...bookClub, name: "Colleagues" }];
    data.occasions = [
      { ...annasBirthday, date: day },
      {
        ...annasBirthday,
        id: "o9" as OccasionId,
        group_id: bookClub.id,
        name: "Team lunch",
        date: "2026-10-22",
      },
    ];
  },
  render: app("/"),
};

export const HomeLoadFailed: Story = {
  beforeEach: () => {
    data.groups = () => Promise.reject(new Error("Failed to fetch"));
  },
  render: app("/"),
};

export const ItemFormNew: Story = { render: app("/lists/me/items/new") };

export const ItemFormEditSelectedGroups: Story = {
  beforeEach: () => {
    data.lists.me = [
      item(3, "me", "LEGO Botanical bonsai tree", 49.99, "Toys", {
        url: "https://www.lego.com/bonsai",
        image_url: bonsaiPicture,
        visible_in_all_groups: false,
        item_groups: [{ group_id: family.id }],
      }),
    ];
  },
  render: app("/items/item-3/edit"),
};

/** Removing the link's picture: focus goes back to the link, and the item saves without it. */
export const ItemFormRemovePicture: Story = {
  beforeEach: ItemFormEditSelectedGroups.beforeEach,
  render: app("/items/item-3/edit"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: t("itemForm.removePicture") }));
    await waitFor(() => expect(canvas.getByLabelText(t("itemForm.link"))).toHaveFocus());
    await expect(canvas.queryByRole("button", { name: t("itemForm.removePicture") })).toBeNull();
  },
};

export const ItemFormError: Story = {
  beforeEach: () => {
    data.addItem = () => Promise.reject(new Error("Could not save the item."));
  },
  render: app("/lists/me/items/new"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText(t("itemForm.name")), "Trail running shoes");
    await userEvent.click(canvas.getByRole("button", { name: t("common.save") }));
  },
};

export const GroupSettingsAsManager: Story = {
  beforeEach: () => {
    data.group = () => ({
      ...family,
      group_members: [
        member(orjan, "manager"),
        member(profile("anna"), "manager"),
        member(profile("lucas", true), "member"),
        member(profile("bert"), "member"),
      ],
    });
    data.invites = ["carla.janssens@example.com"];
    data.occasions = [
      annasBirthday,
      occasion("o2", "Sinterklaas 2026", "2026-12-06"),
      occasion("o3", "Christmas 2026", "2026-12-25"),
      occasion("o4", "Christmas 2025", "2025-12-25"),
    ];
  },
  render: app("/groups/group-1"),
};

export const GroupSettingsAsMember: Story = { render: app("/groups/group-1") };

/** The last manager leaving: they pick who takes over first. */
export const GroupLeaveHandOver: Story = {
  beforeEach: () => {
    data.group = () => ({
      ...family,
      group_members: [member(orjan, "manager"), member(profile("anna"), "member")],
    });
  },
  render: app("/groups/group-1"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: t("group.leave") }));
  },
};

/** A parent also manages their children here: open a list, or delete the child. */
export const SettingsWithChildren: Story = {
  beforeEach: () => {
    data.managed = [profile("lucas", true), profile("mila", true)];
    data.follows = [
      { listId: "anna" as ProfileId, name: "Anna", until: annasBirthday.date },
      { listId: "bert" as ProfileId, name: "Bert", until: "2026-12-25" },
    ];
  },
  render: app("/settings"),
};

/** After sending the email: the code field, here with a code that didn't work. */
export const LoginCode: Story = {
  beforeEach: () => {
    setMockSession(null);
    setMockOtpError("Token has expired or is invalid");
  },
  render: app("/login"),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText(t("login.email")), "orjan@example.com");
    await userEvent.click(canvas.getByRole("button", { name: t("login.send") }));
    await userEvent.type(await canvas.findByLabelText(t("login.code")), "482915");
    await userEvent.click(canvas.getByRole("button", { name: t("login.signIn") }));
  },
};

export const JoinInvited: Story = {
  beforeEach: () => {
    data.joinPreview = { group_id: family.id, group_name: "Family", is_member: false };
  },
  render: app("/join/abc123"),
};

export const JoinAlreadyMember: Story = {
  beforeEach: () => {
    data.joinPreview = { group_id: family.id, group_name: "Family", is_member: true };
  },
  render: app("/join/abc123"),
};

export const JoinExpired: Story = { render: app("/join/abc123") };

/** Opened from a digest email, signed in or not. */
export const UnfollowDone: Story = {
  beforeEach: () => setMockSession(null),
  render: app("/unfollow/token123"),
};

/** Wide screens: the popover open under "Add group". Pick a desktop viewport to see it. */
export const HomeAddGroupPopover: Story = {
  render: app("/"),
  play: () => openPopover("new-group-popover", "(min-width: 900px)"),
};

/** Phones: "+" opens this page. */
export const NewGroupPage: Story = { render: app("/groups/new") };

/** A parent's own list: a dropdown jumps to a child's list. */
export const OwnListAsParent: Story = {
  beforeEach: () => {
    data.managed = [profile("lucas", true), profile("mila", true)];
    data.lists.me = data.lists.me.slice(0, 1);
  },
  render: app("/lists/me"),
};

/** The smallest phones: the tab bar still fits all three tabs. */
export const HomeSmallestPhone: Story = {
  ...Home,
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
