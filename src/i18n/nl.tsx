import type { Dictionary } from "./en.tsx";

/** Dutch UI text. Same keys as en.tsx; TypeScript flags anything missing. */
export const nl: Dictionary = {
  common: {
    loading: "Laden…",
    you: " (jij)",
    save: "Opslaan",
    saving: "Opslaan…",
    cancel: "Annuleren",
    edit: "Bewerken",
    remove: "Verwijderen",
    delete: "Wissen",
    someone: "iemand",
  },
  roles: {
    manager: "Beheerder",
    member: "Lid",
    guardian: "Voogd",
  },
  language: {
    label: "Taal",
  },
  nav: {
    groups: "Groepen",
    myList: "Mijn lijstje",
    myLists: "Mijn lijstjes",
  },
  me: {
    loadFailed: (p) => `Je profiel kon niet geladen worden: ${p.message}`,
  },
  install: {
    label: "Zet op je beginscherm",
    title: "Zet Wishlister op je beginscherm",
    dismiss: "Sluiten",
    promptText: "Dan opent het als een app, zonder de browser errond.",
    install: "Installeren",
    iosSteps: (p) => (
      <>
        Tik op de Deel-knop {p.shareIcon} en dan op <strong>Zet op beginscherm</strong>.
      </>
    ),
  },
  login: {
    intro: "Meld je aan met je e-mailadres. We sturen je een link en een code.",
    email: "E-mailadres",
    send: "Stuur me een aanmeldlink",
    sending: "Versturen…",
    checkInbox: (p) => (
      <>
        Kijk in je mailbox op <strong>{p.email}</strong>. Tik op de link, of typ de code hier.
      </>
    ),
    code: "Code",
    signIn: "Aanmelden",
    checking: "Controleren…",
    otherEmail: "Een ander e-mailadres gebruiken",
  },
  home: {
    title: "Mijn groepen",
    loadFailed: (p) => `Je groepen konden niet geladen worden: ${p.message}`,
    empty:
      "Je zit nog niet in een groep. Maak er hieronder een aan, of vraag iemand om een uitnodigingslink.",
    newGroup: "Nieuwe groep",
    newGroupPlaceholder: "bv. Familie",
    create: "Groep aanmaken",
  },
  groupCard: {
    manage: "Beheren",
    details: "Details",
    guardian: "voogd",
    child: "kind",
  },
  group: {
    back: "‹ Groepen",
    fallbackTitle: "Groep",
    unavailable: "Deze groep is niet beschikbaar.",
    renamed: "Groep hernoemd.",
    members: "Leden",
    guardianHelp:
      "Een voogd zit hier alleen voor de kinderen. Het eigen lijstje van een voogd wordt niet getoond in deze groep.",
    pendingInvites: "Wachten op eerste aanmelding",
    emailInvite: "Mailen",
    inviteByEmail: "Uitnodigen via e-mail",
    invite: "Uitnodigen",
    added: (p) => `${p.email} is aan de groep toegevoegd.`,
    alreadyInvited: (p) => `${p.email} is al uitgenodigd.`,
    alreadyMember: (p) => `${p.email} zit al in de groep.`,
    inviteSent: (p) =>
      `${p.email} zit nu in de groep. We hebben een link gemaild om zich aan te melden.`,
    inviteEmailFailed: (p) =>
      `${p.email} komt erbij bij de eerste aanmelding, maar de e-mail is niet verstuurd: ${p.message}`,
    inviteLink: "Uitnodigingslink",
    inviteLinkHelp: "Iedereen met de link kan erbij, met welk e-mailadres ze zich ook aanmelden.",
    shareLink: "Uitnodigingslink delen",
    shareTitle: (p) => `Kom bij ${p.group} op Wishlister`,
    linkCopied: "Uitnodigingslink gekopieerd. Iedereen die hem opent, kan bij de groep.",
    newLink: "Nieuwe link",
    confirmNewLink:
      "Een nieuwe uitnodigingslink maken? Links die je eerder deelde, werken dan niet meer.",
    newLinkMade: "Nieuwe uitnodigingslink gemaakt. Oude links werken niet meer.",
    children: "Kinderen",
    childrenHelp: "Kinderen melden zich niet aan. Hun ouders beheren hun lijstje.",
    noChildren: "Geen kinderen in deze groep.",
    parents: "Ouders:",
    noParents: "niemand in deze groep",
    removeParentLabel: (p) => `${p.name} als ouder verwijderen`,
    addParent: "Een ouder toevoegen…",
    addMyChild: "Een van je kinderen toevoegen…",
    addNewChild: "Een nieuw kind toevoegen",
    childName: "Naam",
    parent: "Ouder",
    addChild: "Kind toevoegen",
    childAddedByMe: (p) => `${p.child} toegevoegd. Jij beheert het lijstje.`,
    childAdded: (p) => `${p.child} toegevoegd. ${p.parent} beheert het lijstje.`,
    confirmLeave: (p) => `${p.group} verlaten?`,
    confirmRemove: (p) => `${p.name} uit ${p.group} verwijderen?`,
    childrenLeftBehind: (p) =>
      `${p.names} heeft dan geen ouder meer in deze groep en wordt er dus ook uit verwijderd.`,
    groupWillBeDeleted: (p) => `Er blijft niemand meer over, dus ${p.group} wordt gewist.`,
    confirmRemoveParent: (p) => `${p.parent} verwijderen als ouder van ${p.child}?`,
    confirmDeleteGroup: (p) =>
      `${p.group} voor iedereen wissen? Lijstjes en items blijven bewaard.`,
    groupName: "Groepsnaam",
    rename: "Hernoemen",
    leave: "Groep verlaten",
    chooseSuccessor: (p) => `Jij bent de enige beheerder. Wie beheert ${p.group} als jij weggaat?`,
    chooseMember: "Kies een lid…",
    handOverAndLeave: "Beheerder maken en verlaten",
    stay: "In de groep blijven",
    deleteGroup: "Groep wissen",
  },
  occasions: {
    title: "Gelegenheden",
    help: "Momenten waarop deze groep cadeaus geeft, zoals Kerstmis of een verjaardag.",
    none: "Geen gelegenheden gepland.",
    past: (p: { count: number }) => `Voorbije gelegenheden (${p.count})`,
    name: "Naam",
    namePlaceholder: "bv. Kerstmis 2026",
    date: "Datum",
    add: "Gelegenheid toevoegen",
    new: "Nieuwe gelegenheid",
    confirmDelete: (p: { name: string }) => `${p.name} wissen voor de hele groep?`,
  },
  child: {
    confirmDelete: (p) =>
      `Het profiel en verlanglijstje van ${p.name} voor iedereen wissen? Dit kan niet ongedaan gemaakt worden.`,
  },
  item: {
    onlyVisibleIn: (p) => `Alleen zichtbaar in ${p.groups}`,
    private: "🔒 Met geen enkele groep gedeeld",
    youBought: "Jij hebt dit gekocht",
    undo: "Ongedaan maken",
    someoneBought: "Iemand heeft dit gekocht",
    iBought: "Ik heb dit gekocht",
    youBoughtFor: (p) => `Jij kocht dit voor ${p.occasion}`,
    forWhichOccasion: "Voor welke gelegenheid is het?",
    noOccasion: "Niet voor een gelegenheid",
  },
  unfollow: {
    title: "Niet meer volgen",
    done: (p) =>
      `Je volgt het lijstje van ${p.name} niet meer. Je kan het opnieuw volgen vanop het lijstje zelf.`,
    notFound: "Je volgde dit lijstje al niet meer, of het volgen was afgelopen.",
    failed: (p) => `Dat lukte niet: ${p.message}`,
    toApp: "Wishlister openen",
  },
  follow: {
    pitch: (p) =>
      `Volg het lijstje van ${p.name} en krijg een e-mail op dagen dat er iets bijkomt, verdwijnt of gekocht wordt.`,
    follow: "Volgen",
    until: "Tot",
    untilOccasion: (p) => `Dat is ${p.occasion}.`,
    following: (p) =>
      `Je volgt dit lijstje tot ${p.date}. Je krijgt een e-mail op dagen dat er iets verandert.`,
    changeDate: "Datum aanpassen",
    stop: "Niet meer volgen",
  },

  listOrder: {
    label: "Sorteren op",
    added: "Datum toegevoegd",
    newest: "Nieuwste eerst",
    name: "Naam (A tot Z)",
    category: "Categorie",
    available: "Nog niet gekocht eerst",
    uncategorised: "Geen categorie",
  },
  quickAdd: {
    label: "Snel toevoegen",
    placeholder: "Typ een wens of plak een link en druk op Enter",
    visibleIn: "Wie ziet nieuwe items",
    allGroups: "Alle groepen",
    noGroupsHint: "Geen groep gekozen: alleen jij ziet ze tot je ze deelt.",
    saving: "Opslaan…",
    notSaved: "Nog niet opgeslagen",
    retrying: "Opslaan mislukt. We proberen het opnieuw…",
  },
  itemForm: {
    addTitle: "Item toevoegen",
    editTitle: "Item bewerken",
    name: "Naam",
    link: "Link (optioneel)",
    category: "Categorie (optioneel)",
    visibility: "Wie kan het zien",
    allGroups: "Al mijn groepen",
    selectedGroups: "Alleen gekozen groepen",
    noGroups: "Dit lijstje zit nog in geen enkele groep.",
    noGroupsOption: "Geen groepen (alleen ik)",
  },
  categories: {
    books: "Boeken",
    clothes: "Kleding",
    toys: "Speelgoed",
    games: "Spellen",
    music: "Muziek",
    experiences: "Belevenissen",
    home: "Huis",
    sports: "Sport",
  },
  join: {
    title: "Bij een groep komen",
    openFailed: (p) => `Deze uitnodiging kon niet geopend worden: ${p.message}`,
    expired: "Deze uitnodigingslink werkt niet meer. Vraag een nieuwe.",
    toGroups: "Naar mijn groepen",
    alreadyIn: (p) => `Je zit al in ${p.group}.`,
    open: (p) => `${p.group} openen`,
    invited: (p) => (
      <>
        Je bent uitgenodigd voor <strong>{p.group}</strong>. Kom erbij om ieders verlanglijstje te
        zien en het jouwe te delen.
      </>
    ),
    join: (p) => `Bij ${p.group} komen`,
    joining: "Bezig…",
  },
  account: {
    myLists: "Mijn lijstjes",
    title: "Account",
    myWishlist: "Mijn verlanglijstje",
    childWishlist: (p) => `Verlanglijstje van ${p.name}`,
    yourName: "Je naam, zoals anderen hem zien",
    saveName: "Naam opslaan",
    saved: "Opgeslagen.",
    signOut: "Afmelden",
  },
  bulk: {
    title: "Meerdere items bewerken",
    select: "Selecteren",
    selected: (p) => `${p.count} geselecteerd`,
    selectAll: "Alles selecteren",
    selectNone: "Niets selecteren",
    setCategory: "Categorie",
    setGroups: "Groepen",
    done: "Klaar",
    apply: "Toepassen",
    categoryLabel: "Categorie voor de geselecteerde items",
    categoryPlaceholder: "Laat leeg om ze weg te halen",
    clearCategory: "Categorie weghalen",
    confirmDelete: (p) =>
      p.count === 1
        ? "1 item van het lijstje verwijderen?"
        : `${p.count} items van het lijstje verwijderen?`,
  },
  wishlist: {
    fallbackTitle: "Verlanglijstje",
    mine: "Mijn verlanglijstje",
    theirs: (p) => `Verlanglijstje van ${p.name}`,
    accountLink: "Je naam, taal en afmelden",
    unavailable: "Dit lijstje is niet beschikbaar. Misschien is het niet met jou gedeeld.",
    emptyOwn: "Nog niets op dit lijstje.",
    empty: "Dit lijstje is nog leeg.",
    confirmRemoveItem: (p) => `"${p.item}" van het lijstje verwijderen?`,
    deleteProfile: (p) => `Profiel van ${p.name} wissen`,
    addItem: "+ Item toevoegen",
    aGroup: "een groep",
  },
};
