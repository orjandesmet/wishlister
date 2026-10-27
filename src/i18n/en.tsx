import type { JSX } from "solid-js";

/**
 * English UI text, and the shape every other language follows: nl.tsx is typed
 * as `Dictionary`, so a missing or misnamed key there is a type error.
 *
 * Plain strings for fixed text, functions for text with names or numbers in it.
 * A function may return JSX when part of the sentence is bold.
 */
export const en = {
  common: {
    loading: "Loading…",
    you: " (you)",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Remove",
    close: "Close",
    delete: "Delete",
    someone: "someone",
  },
  roles: {
    manager: "Manager",
    member: "Member",
    guardian: "Guardian",
  },
  language: {
    label: "Language",
  },
  themes: {
    label: "Seasonal themes",
    hint: "The app dresses up for Sinterklaas, Christmas, New Year, Easter, Halloween and 1 March.",
    now: (p: { theme: string }) => `Today it's dressed up for ${p.theme}.`,
    sinterklaas: "Sinterklaas",
    christmas: "Christmas",
    newYear: "New Year",
    birthday: "a birthday",
    halloween: "Halloween",
    easter: "Easter",
  },
  currency: {
    label: "Show prices in",
    hint: "Prices in another currency also show roughly what they are in this one.",
  },
  nav: {
    groups: "Groups",
    myList: "My list",
    settings: "Settings",
  },
  me: {
    loadFailed: (p: { message: string }) => `Couldn't load your profile: ${p.message}`,
  },
  install: {
    label: "Add to home screen",
    title: "Add Wishlister to your home screen",
    dismiss: "Dismiss",
    promptText: "It opens like an app, without the browser around it.",
    install: "Install",
    iosSteps: (p: { shareIcon: JSX.Element }): JSX.Element => (
      <>
        Tap the Share button {p.shareIcon}, then <strong>Add to Home Screen</strong>.
      </>
    ),
  },
  login: {
    intro: "Sign in with your email. We'll send you a link and a code.",
    email: "Email address",
    send: "Send me a login link",
    sending: "Sending…",
    checkInbox: (p: { email: string }): JSX.Element => (
      <>
        Check your inbox at <strong>{p.email}</strong>. Tap the link, or type the code here.
      </>
    ),
    code: "Code",
    signIn: "Sign in",
    checking: "Checking…",
    otherEmail: "Use a different email",
    signupsClosed:
      "New registrations are closed right now. Ask someone in your group to invite you.",
    demoIntro: "This is a demo. Pick someone to sign in as. Everything resets every few days.",
    demoAs: (p: { name: string }) => `Sign in as ${p.name}`,
  },
  home: {
    title: "My groups",
    loadFailed: (p: { message: string }) => `Couldn't load your groups: ${p.message}`,
    empty: "You're not in a group yet. Create one below, or ask someone for an invite link.",
    newGroup: "New group",
    addGroup: "Add group",
    newGroupPlaceholder: "e.g. Family",
    create: "Create group",
  },
  groupCard: {
    manage: "Manage",
    details: "Details",
    guardian: "guardian",
    child: "child",
    nextOccasion: (p: { name: string; date: string; when: string }) =>
      `${p.name} · ${p.date} (${p.when})`,
    today: "today",
    tomorrow: "tomorrow",
    inDays: (p: { days: number }) => `in ${p.days} days`,
    occasionLine: (p: { name: string; date: string }) => `${p.name} · ${p.date}`,
    daysUnit: "days",
  },
  group: {
    back: "‹ Groups",
    fallbackTitle: "Group",
    unavailable: "This group isn't available.",
    renamed: "Group renamed.",
    members: "Members",
    guardianHelp:
      "A guardian is only here to look after their children. Their own list isn't shown in this group.",
    pendingInvites: "Waiting for first sign-in",
    emailInvite: "Email",
    inviteByEmail: "Invite by email",
    invite: "Invite",
    added: (p: { email: string }) => `${p.email} was added to the group.`,
    addedEmailed: (p: { email: string }) =>
      `${p.email} was added to the group. We emailed them to let them know.`,
    addedEmailFailed: (p: { email: string; message: string }) =>
      `${p.email} was added to the group, but the email to let them know didn't go out: ${p.message}`,
    alreadyInvited: (p: { email: string }) => `${p.email} is already invited.`,
    alreadyMember: (p: { email: string }) => `${p.email} is already in the group.`,
    inviteSent: (p: { email: string }) =>
      `${p.email} is in the group now. We emailed them a link to sign in.`,
    inviteEmailFailed: (p: { email: string; message: string }) =>
      `${p.email} will join when they first sign in, but the email didn't go out: ${p.message}`,
    inviteLink: "Invite link",
    inviteLinkHelp: "Anyone with the link can join, whatever email they sign in with.",
    shareLink: "Share invite link",
    shareTitle: (p: { group: string }) => `Join ${p.group} on Wishlister`,
    linkCopied: "Invite link copied. Anyone who opens it can join the group.",
    newLink: "New link",
    confirmNewLink: "Make a new invite link? Links you shared before will stop working.",
    newLinkMade: "New invite link made. Old links don't work anymore.",
    children: "Children",
    childrenHelp: "Children don't sign in. Their parents look after their list.",
    noChildren: "No children in this group.",
    parents: "Parents:",
    noParents: "nobody in this group",
    removeParentLabel: (p: { name: string }) => `Remove ${p.name} as parent`,
    addParent: "Add a parent…",
    addMyChild: "Add one of your children…",
    addNewChild: "Add a new child",
    childName: "Name",
    parent: "Parent",
    addChild: "Add child",
    childAddedByMe: (p: { child: string }) => `Added ${p.child}. You look after their list.`,
    childAdded: (p: { child: string; parent: string }) =>
      `Added ${p.child}. ${p.parent} looks after their list.`,
    confirmLeave: (p: { group: string }) => `Leave ${p.group}?`,
    confirmRemove: (p: { name: string; group: string }) => `Remove ${p.name} from ${p.group}?`,
    childrenLeftBehind: (p: { names: string }) =>
      `${p.names} will have no parent left in this group, so they'll be removed from it too.`,
    groupWillBeDeleted: (p: { group: string }) =>
      `No one else is left, so ${p.group} will be deleted.`,
    confirmRemoveParent: (p: { parent: string; child: string }) =>
      `Remove ${p.parent} as ${p.child}'s parent?`,
    confirmDeleteGroup: (p: { group: string }) =>
      `Delete ${p.group} for everyone? Lists and items are kept.`,
    groupName: "Group name",
    rename: "Rename",
    leave: "Leave group",
    chooseSuccessor: (p: { group: string }) =>
      `You're the only manager. Who should manage ${p.group} after you leave?`,
    chooseMember: "Choose a member…",
    handOverAndLeave: "Make manager and leave",
    stay: "Stay in the group",
    deleteGroup: "Delete group",
  },
  occasions: {
    title: "Occasions",
    help: "Dates this group gives presents for, like Christmas or a birthday.",
    none: "No upcoming occasions.",
    past: (p: { count: number }) => `Past occasions (${p.count})`,
    name: "Name",
    namePlaceholder: "e.g. Christmas 2026",
    date: "Date",
    add: "Add occasion",
    new: "New occasion",
    confirmDelete: (p: { name: string }) => `Delete ${p.name} for the whole group?`,
  },
  child: {
    editProfile: "Edit profile",
    name: "Name",
    fallbackTitle: "Child",
    unavailable: "This child is unavailable.",
    parents: "Parents",
    deleteProfile: "Delete profile",
    confirmDelete: (p: { name: string }) =>
      `Delete ${p.name}'s profile and wishlist for everyone? This can't be undone.`,
  },
  item: {
    viewPicture: (p: { name: string }) => `View picture: ${p.name}`,
    pictureOf: (p: { name: string }) => `Picture of ${p.name}`,
    viewPictures: (p: { name: string; count: number }) => `View ${p.count} pictures: ${p.name}`,
    pictureNumberOf: (p: { name: string; number: number; count: number }) =>
      `Picture ${p.number} of ${p.count} of ${p.name}`,
    onlyVisibleIn: (p: { groups: JSX.Element }) => <>Only visible in {p.groups}</>,
    private: "Not shared with any group",
    youBought: "You bought this",
    undo: "Undo",
    someoneBought: "Someone bought this",
    iBought: "I bought this",
    youBoughtFor: (p: { occasion: string }) => `You bought this for ${p.occasion}`,
    forWhichOccasion: "Which occasion is it for?",
    noOccasion: "Not for an occasion",
    notWanted: "Please don't buy",
    convertedPrice: (p: { price: string }) => `≈ ${p.price}`,
    removed: "Taken off the list after it was bought",
    removedMine:
      "Taken off the list after you bought it. Can you still cancel your order? Then undo, and it's gone for good.",
    showMore: "Show more",
    showLess: "Show less",
  },
  questions: {
    ask: "Ask a question",
    count: (p: { count: number }) => (p.count === 1 ? "1 question" : `${p.count} questions`),
    countToAnswer: (p: { count: number; open: number }) =>
      `${p.count === 1 ? "1 question" : `${p.count} questions`}, ${p.open} to answer`,
    title: (p: { name: string }) => `Questions about ${p.name}`,
    anonymous: "Questions are anonymous: nobody sees who asked, not even the others.",
    anonymousOwner: "Nobody sees who asked. Your answer shows with your name.",
    none: "No questions yet.",
    questionLabel: "Question",
    answerLabel: "Answer",
    answerFrom: (p: { name: string }) => `Answer from ${p.name}`,
    notAnswered: "Not answered yet.",
    yours: "You asked this.",
    yourAnswer: "Your answer",
    editAnswer: "Change your answer",
    saveAnswer: "Save answer",
    change: "Change answer",
    yourQuestion: "Your question",
    askHint: "The list's owner gets an email, and you get one when they answer.",
    send: "Ask anonymously",
    closed: "It's bought, so nobody can ask anything new.",
  },
  unfollow: {
    title: "Stop following",
    done: (p: { name: string }) =>
      `You no longer follow ${p.name}'s list. You can follow it again from the list itself.`,
    notFound: "You already stopped following this list, or it ended.",
    failed: (p: { message: string }) => `That didn't work: ${p.message}`,
    toApp: "Open Wishlister",
  },
  follow: {
    pitch: (p: { name: string }) =>
      `Follow ${p.name}'s list to get an email on days something is added, removed or bought.`,
    follow: "Follow",
    until: "Until",
    untilOccasion: (p: { occasion: string }) => `That's ${p.occasion}.`,
    following: (p: { date: string }) =>
      `You're following this list until ${p.date}. You get an email on days something changes.`,
    title: (p: { name: string }) => `Follow ${p.name}'s list`,
    followingTitle: "You're following this list",
    untilDate: (p: { date: string }) => `Until ${p.date}`,
    emailNote: "You get an email on days something is added, removed or bought.",
    changeDate: "Change date",
    stop: "Stop following",
    autoFollowed: "You're now following this list",
  },

  listOrder: {
    label: "Sort by",
    added: "Date added",
    newest: "Newest first",
    name: "Name (A to Z)",
    category: "Category",
    available: "Not bought yet first",
    uncategorised: "No category",
    notWanted: "Please don't buy",
  },
  quickAdd: {
    label: "Quick add",
    placeholder: "Type a wish or paste a link, then press Enter",
    visibleIn: "Who can see new items",
    allGroups: "All groups",
    noGroupsHint: "No group picked: only you see them until you share them.",
    saving: "Saving…",
    notSaved: "Not saved yet",
    retrying: "Couldn't save. Trying again…",
    moreOptions: "More options…",
    notWantedHint: () => (
      <>
        Start with <strong>!</strong> for something you don't want, like <strong>!socks</strong>.
      </>
    ),
  },
  pictures: {
    legend: "Your pictures (optional)",
    hint: (p: { max: number }) =>
      `Up to ${p.max}, from your phone or a link. They're shown before the link's picture.`,
    add: "Add pictures",
    link: "Or a link to a picture",
    addLink: "Add",
    badLink: "That isn't a link to a picture. It starts with https://",
    remove: "Remove",
    number: (p: { number: number }) => `picture ${p.number}`,
    full: (p: { max: number }) => `That's ${p.max} pictures, the most an item can have.`,
    added: (p: { count: number }) =>
      p.count === 1 ? "Picture added." : `${p.count} pictures added.`,
    tooMany: (p: { added: number; max: number }) =>
      `Added ${p.added}: an item can have at most ${p.max} pictures.`,
    uploading: (p: { number: number; of: number }) => `Uploading picture ${p.number} of ${p.of}…`,
    uploadFailed: (p: { message: string }) =>
      `Couldn't upload a picture, so nothing was saved: ${p.message}`,
  },
  itemForm: {
    addTitle: "Add item",
    saveAndAnother: "Save, and add another",
    savedAnother: (p: { name: string }) => `Saved “${p.name}”. Add the next one.`,
    editTitle: "Edit item",
    name: "Name",
    link: "Link (optional)",
    lookingUp: "Looking up the link…",
    filledFromLink: "Filled in from the link's page.",
    imageLink: "This link is a picture: it's used as the item's picture.",
    nothingFromLink: "Couldn't read anything from this link.",
    pictureFromLink: "The picture from the link, shown on the item.",
    removePicture: "Remove picture",
    pictureRemoved: "Picture removed.",
    category: "Category (optional)",
    description: "Description (optional)",
    descriptionHint: () => (
      <>
        Like the size or colour. <strong>**bold**</strong>, <em>*italic*</em>, lines starting with
        "- " for a list, and links work.
      </>
    ),
    visibility: "Who can see it",
    allGroups: "All my groups",
    selectedGroups: "Only selected groups",
    noGroups: "This list isn't in any groups yet.",
    noGroupsOption: "No groups (only me)",
    notWanted: "Please don't buy this: something I don't want",
    price: "Price (optional)",
    currency: "Currency",
    invalidPrice: "Enter a price like 12.50, or leave it empty.",
    loadFailed: (p: { message: string }) => `Couldn't open this item: ${p.message}`,
  },
  // Suggested under the category field, even before anyone has used a category.
  categories: {
    books: "Books",
    clothes: "Clothes",
    toys: "Toys",
    games: "Games",
    music: "Music",
    experiences: "Experiences",
    home: "Home",
    sports: "Sports",
  },
  join: {
    title: "Join a group",
    openFailed: (p: { message: string }) => `Couldn't open this invite: ${p.message}`,
    expired: "This invite link doesn't work anymore. Ask for a new one.",
    toGroups: "Go to my groups",
    alreadyIn: (p: { group: string }) => `You're already in ${p.group}.`,
    open: (p: { group: string }) => `Open ${p.group}`,
    invited: (p: { group: string }): JSX.Element => (
      <>
        You've been invited to <strong>{p.group}</strong>. Join to see everyone's wishlists and
        share yours.
      </>
    ),
    join: (p: { group: string }) => `Join ${p.group}`,
    joining: "Joining…",
  },
  account: {
    title: "Settings",
    children: "Children",
    childrenHelp: "The wish lists of the children you look after. Open one to add their wishes.",
    deleteProfile: "Delete profile",
    childWishlist: (p: { name: string }) => `${p.name}'s wishlist`,
    yourName: "Your name, as others see it",
    saveName: "Save name",
    saved: "Saved.",
    signOut: "Sign out",
  },
  notifications: {
    title: "Notifications",
    help: "The lists you get an email about when something changes.",
    none: "You're not following any lists.",
    unsubscribeAll: "Unsubscribe from all",
    confirmUnsubscribeAll: "Stop following all lists? You won't get any more emails.",
  },
  bulk: {
    title: "Edit several items",
    select: "Select",
    selected: (p: { count: number }) => (p.count === 1 ? "1 selected" : `${p.count} selected`),
    selectAll: "Select all",
    selectNone: "Select none",
    setCategory: "Category",
    setGroups: "Groups",
    done: "Done",
    apply: "Apply",
    categoryLabel: "Category for the selected items",
    categoryPlaceholder: "Leave empty to remove it",
    clearCategory: "Remove category",
    confirmDelete: (p: { count: number }) =>
      p.count === 1 ? "Remove 1 item from the list?" : `Remove ${p.count} items from the list?`,
  },
  // Only for screen readers: names of unlabelled controls, and announcements of
  // changes that happen out of sight.
  a11y: {
    mainNav: "Main",
    roleOf: (p: { name: string }) => `Role of ${p.name}`,
    added: (p: { items: string }) => `Added ${p.items}.`,
    removed: (p: { item: string }) => `Removed ${p.item}.`,
    bought: (p: { item: string }) => `Marked ${p.item} as bought.`,
    unbought: (p: { item: string }) => `${p.item} is no longer marked as bought.`,
    unboughtRemoved: (p: { item: string }) =>
      `${p.item} is no longer marked as bought, and is gone from the list.`,
    changed: (p: { count: number }) =>
      p.count === 1 ? "1 item changed." : `${p.count} items changed.`,
    deleted: (p: { count: number }) =>
      p.count === 1 ? "1 item removed." : `${p.count} items removed.`,
    unfollowed: "You stopped following this list.",
    asked: "Your question was sent.",
    answered: "Your answer was saved.",
  },
  wishlist: {
    fallbackTitle: "Wishlist",
    switchList: "Other lists",
    mine: "My wishlist",
    theirs: (p: { name: string }) => `${p.name}'s wishlist`,
    unavailable: "This list isn't available. It may not be shared with you.",
    emptyOwn: "Nothing on this list yet.",
    empty: "This list is still empty.",
    confirmRemoveItem: (p: { item: string }) => `Remove "${p.item}" from the list?`,
    deleteProfile: (p: { name: string }) => `Delete ${p.name}'s profile`,
    addItem: "Add item",
    aGroup: "a group",
  },
};

export type Dictionary = typeof en;
