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
    close: "Sluiten",
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
  themes: {
    label: "Seizoensthema's",
    hint: "De app kleedt zich aan voor Sinterklaas, Kerstmis, Nieuwjaar, Pasen, Halloween en 1 maart.",
    now: (p) => `Vandaag aangekleed voor ${p.theme}.`,
    sinterklaas: "Sinterklaas",
    christmas: "Kerstmis",
    newYear: "Nieuwjaar",
    birthday: "een verjaardag",
    halloween: "Halloween",
    easter: "Pasen",
  },
  currency: {
    label: "Toon prijzen in",
    hint: "Bij prijzen in een andere munt zie je ook ongeveer hoeveel dat in deze munt is.",
  },
  nav: {
    groups: "Groepen",
    myList: "Mijn lijstje",
    settings: "Instellingen",
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
    signupsClosed:
      "Nieuwe registraties zijn momenteel gesloten. Vraag iemand uit je groep om je uit te nodigen.",
    demoIntro:
      "Dit is een demo. Kies als wie je wilt aanmelden. Alles wordt om de paar dagen teruggezet.",
    demoAs: (p) => `Aanmelden als ${p.name}`,
  },
  home: {
    title: "Mijn groepen",
    loadFailed: (p) => `Je groepen konden niet geladen worden: ${p.message}`,
    empty:
      "Je zit nog niet in een groep. Maak er hieronder een aan, of vraag iemand om een uitnodigingslink.",
    newGroup: "Nieuwe groep",
    addGroup: "Groep toevoegen",
    newGroupPlaceholder: "bv. Familie",
    create: "Groep aanmaken",
  },
  groupCard: {
    manage: "Beheren",
    details: "Details",
    guardian: "voogd",
    child: "kind",
    nextOccasion: (p) => `${p.name} · ${p.date} (${p.when})`,
    today: "vandaag",
    tomorrow: "morgen",
    inDays: (p) => `over ${p.days} dagen`,
    occasionLine: (p) => `${p.name} · ${p.date}`,
    daysUnit: "dagen",
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
    addedEmailed: (p) =>
      `${p.email} is aan de groep toegevoegd. We hebben een e-mail gestuurd om het te laten weten.`,
    addedEmailFailed: (p) =>
      `${p.email} is aan de groep toegevoegd, maar de e-mail om het te laten weten is niet verstuurd: ${p.message}`,
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
    editProfile: "Profiel bewerken",
    name: "Naam",
    fallbackTitle: "Kind",
    unavailable: "Dit kind is niet beschikbaar.",
    parents: "Ouders",
    deleteProfile: "Profiel wissen",
    confirmDelete: (p) =>
      `Het profiel en verlanglijstje van ${p.name} voor iedereen wissen? Dit kan niet ongedaan gemaakt worden.`,
  },
  item: {
    viewPicture: (p) => `Afbeelding bekijken: ${p.name}`,
    pictureOf: (p) => `Afbeelding van ${p.name}`,
    onlyVisibleIn: (p) => <>Alleen zichtbaar in {p.groups}</>,
    private: "Met geen enkele groep gedeeld",
    youBought: "Jij hebt dit gekocht",
    undo: "Ongedaan maken",
    someoneBought: "Iemand heeft dit gekocht",
    iBought: "Ik heb dit gekocht",
    youBoughtFor: (p) => `Jij kocht dit voor ${p.occasion}`,
    forWhichOccasion: "Voor welke gelegenheid is het?",
    noOccasion: "Niet voor een gelegenheid",
    notWanted: "Liever niet",
    convertedPrice: (p) => `≈ ${p.price}`,
    removed: "Van het lijstje gehaald nadat het gekocht was",
    removedMine:
      "Van het lijstje gehaald nadat jij het kocht. Kun je je bestelling nog annuleren? Maak het dan ongedaan, dan verdwijnt het voorgoed.",
    showMore: "Toon meer",
    showLess: "Toon minder",
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
    title: (p) => `Volg het lijstje van ${p.name}`,
    followingTitle: "Je volgt dit lijstje",
    untilDate: (p) => `Tot ${p.date}`,
    emailNote: "Je krijgt een e-mail op dagen dat er iets bijkomt, verdwijnt of gekocht wordt.",
    changeDate: "Datum aanpassen",
    stop: "Niet meer volgen",
    autoFollowed: "Je volgt dit lijstje nu",
  },

  listOrder: {
    label: "Sorteren op",
    added: "Datum toegevoegd",
    newest: "Nieuwste eerst",
    name: "Naam (A tot Z)",
    category: "Categorie",
    available: "Nog niet gekocht eerst",
    uncategorised: "Geen categorie",
    notWanted: "Liever niet",
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
    moreOptions: "Meer opties…",
    notWantedHint: () => (
      <>
        Begin met <strong>!</strong> voor iets wat je niet wilt, zoals <strong>!kousen</strong>.
      </>
    ),
  },
  itemForm: {
    addTitle: "Item toevoegen",
    saveAndAnother: "Opslaan en nog een toevoegen",
    savedAnother: (p) => `“${p.name}” opgeslagen. Voeg de volgende toe.`,
    editTitle: "Item bewerken",
    name: "Naam",
    link: "Link (optioneel)",
    lookingUp: "Link opzoeken…",
    filledFromLink: "Aangevuld met info van de pagina.",
    imageLink: "Deze link is een afbeelding: die wordt de afbeelding van het item.",
    nothingFromLink: "Kon niets lezen van deze link.",
    pictureFromLink: "De afbeelding van de link, getoond bij het item.",
    removePicture: "Afbeelding verwijderen",
    pictureRemoved: "Afbeelding verwijderd.",
    category: "Categorie (optioneel)",
    description: "Beschrijving (optioneel)",
    descriptionHint: () => (
      <>
        Zoals de maat of kleur. <strong>**vet**</strong>, <em>*schuin*</em>, regels die beginnen met
        "- " voor een lijstje, en links werken.
      </>
    ),
    visibility: "Wie kan het zien",
    allGroups: "Al mijn groepen",
    selectedGroups: "Alleen gekozen groepen",
    noGroups: "Dit lijstje zit nog in geen enkele groep.",
    noGroupsOption: "Geen groepen (alleen ik)",
    notWanted: "Liever niet: iets wat ik niet wil krijgen",
    price: "Prijs (optioneel)",
    currency: "Munt",
    invalidPrice: "Geef een prijs zoals 12,50, of laat het leeg.",
    loadFailed: (p) => `Dit item kon niet geopend worden: ${p.message}`,
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
    title: "Instellingen",
    children: "Kinderen",
    childrenHelp:
      "De verlanglijstjes van de kinderen voor wie je zorgt. Open er een om hun wensen toe te voegen.",
    deleteProfile: "Profiel wissen",
    childWishlist: (p) => `Lijstje van ${p.name}`,
    yourName: "Je naam, zoals anderen hem zien",
    saveName: "Naam opslaan",
    saved: "Opgeslagen.",
    signOut: "Afmelden",
  },
  notifications: {
    title: "Meldingen",
    help: "De lijstjes waarvan je een e-mail krijgt als er iets verandert.",
    none: "Je volgt geen lijstjes.",
    unsubscribeAll: "Alles stopzetten",
    confirmUnsubscribeAll: "Alle lijstjes niet meer volgen? Je krijgt dan geen e-mails meer.",
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
  a11y: {
    mainNav: "Hoofdmenu",
    roleOf: (p) => `Rol van ${p.name}`,
    added: (p) => `${p.items} toegevoegd.`,
    removed: (p) => `${p.item} verwijderd.`,
    bought: (p) => `${p.item} gemarkeerd als gekocht.`,
    unbought: (p) => `${p.item} is niet meer gemarkeerd als gekocht.`,
    changed: (p) => (p.count === 1 ? "1 item gewijzigd." : `${p.count} items gewijzigd.`),
    deleted: (p) => (p.count === 1 ? "1 item verwijderd." : `${p.count} items verwijderd.`),
    unfollowed: "Je volgt dit lijstje niet meer.",
  },
  wishlist: {
    fallbackTitle: "Verlanglijstje",
    switchList: "Andere lijstjes",
    mine: "Mijn verlanglijstje",
    theirs: (p) => `Lijstje van ${p.name}`,
    unavailable: "Dit lijstje is niet beschikbaar. Misschien is het niet met jou gedeeld.",
    emptyOwn: "Nog niets op dit lijstje.",
    empty: "Dit lijstje is nog leeg.",
    confirmRemoveItem: (p) => `"${p.item}" van het lijstje verwijderen?`,
    deleteProfile: (p) => `Profiel van ${p.name} wissen`,
    addItem: "Item toevoegen",
    aGroup: "een groep",
  },
};
