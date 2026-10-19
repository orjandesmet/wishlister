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
  nav: {
    groups: "Groups",
    myList: "My list",
    myLists: "My lists",
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
  },
  home: {
    title: "My groups",
    loadFailed: (p: { message: string }) => `Couldn't load your groups: ${p.message}`,
    empty:
      "You're not in a group yet. Create one below, or ask someone for an invite link or code.",
    newGroup: "New group",
    newGroupPlaceholder: "e.g. Family",
    create: "Create group",
  },
  joinCode: {
    label: "Join with a code",
    placeholder: "Invite code or link",
    submit: "Join",
    invalid: "That doesn't look like an invite code. Paste the code or the whole invite link.",
  },
  groupCard: {
    manage: "Manage",
    details: "Details",
    guardian: "guardian",
    child: "child",
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
  child: {
    confirmDelete: (p: { name: string }) =>
      `Delete ${p.name}'s profile and wishlist for everyone? This can't be undone.`,
  },
  item: {
    onlyVisibleIn: (p: { groups: string }) => `Only visible in ${p.groups}`,
    noGroups: "no groups",
    youBought: "You bought this",
    undo: "Undo",
    someoneBought: "Someone bought this",
    iBought: "I bought this",
  },
  itemForm: {
    addTitle: "Add item",
    editTitle: "Edit item",
    name: "Name",
    link: "Link (optional)",
    category: "Category (optional)",
    visibility: "Who can see it",
    allGroups: "All my groups",
    selectedGroups: "Only selected groups",
    noGroups: "This list isn't in any groups yet.",
    pickGroup: "Pick at least one group, or show the item in all groups.",
  },
  join: {
    title: "Join a group",
    openFailed: (p: { message: string }) => `Couldn't open this invite: ${p.message}`,
    expired: "This invite link or code doesn't work. Ask for a new one.",
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
    myLists: "My lists",
    title: "Account",
    myWishlist: "My wishlist",
    childWishlist: (p: { name: string }) => `${p.name}'s wishlist`,
    yourName: "Your name, as others see it",
    saveName: "Save name",
    saved: "Saved.",
    signOut: "Sign out",
  },
  wishlist: {
    fallbackTitle: "Wishlist",
    mine: "My wishlist",
    theirs: (p: { name: string }) => `${p.name}'s wishlist`,
    accountLink: "Your name, language and sign out",
    unavailable: "This list isn't available. It may not be shared with you.",
    emptyOwn: "Nothing on this list yet.",
    empty: "This list is still empty.",
    confirmRemoveItem: (p: { item: string }) => `Remove "${p.item}" from the list?`,
    deleteProfile: (p: { name: string }) => `Delete ${p.name}'s profile`,
    addItem: "+ Add item",
    aGroup: "a group",
  },
};

export type Dictionary = typeof en;
