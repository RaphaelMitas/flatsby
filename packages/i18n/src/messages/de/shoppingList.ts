import type { Messages } from "../../messages";

export const shoppingList = {
  allLists: "Alle Listen",
  createFailed: "Einkaufsliste konnte nicht erstellt werden",
  createShoppingList: "Einkaufsliste erstellen",
  editItem: "Artikel bearbeiten",
  emptyList:
    "Diese Einkaufsliste ist noch leer. Füge unten deinen ersten Artikel hinzu!",
  itemsLeft: "{count} Artikel offen",
  listNameLabel: "Listenname",
  loadingMoreItems: "Weitere Artikel werden geladen...",
  namePlaceholder: "Namen der Einkaufsliste eingeben",
  noListsYet: "Noch keine Einkaufslisten",
  noMoreItems: "Keine weiteren Artikel",
  purchasedItems: "Gekaufte Artikel",
  renameFailed: "Einkaufsliste konnte nicht umbenannt werden",
  renamePlaceholder: "Neuen Namen eingeben",
  selectGroupToView: "Wähle eine Gruppe, um ihre Einkaufsliste zu sehen",
  sidebarTitle: "Einkaufslisten",
  yourShoppingList: "Deine Einkaufsliste",
  switcher: {
    title: "Listen",
    listCount: "{count, plural, one {# Liste} other {# Listen}}",
    newList: "Neue Liste",
    moreFor: "Mehr zu {name}",
    editTitle: "Liste bearbeiten",
  },
  firstList: {
    title: "Leg deine erste Liste an",
    body: "Alle in {group} sehen sie und können etwas hinzufügen.",
    presets: {
      groceries: "Lebensmittel",
      drugstore: "Drogerie",
      hardware: "Baumarkt",
    },
  },
  create: {
    createList: "Liste erstellen",
    failed: "Unbekannter Fehler beim Erstellen der Einkaufsliste",
    namePlaceholder: "Gib den Namen deiner Einkaufsliste ein",
    submit: "Erstellen",
  },
  delete: {
    confirmationLabel:
      "Gib zur Bestätigung den Namen der Einkaufsliste ein: {name}",
    description:
      "Möchtest du „{name}“ wirklich löschen? Das kann nicht rückgängig gemacht werden und alle Artikel dieser Liste werden dauerhaft entfernt.",
    descriptionShort:
      "Möchtest du „{name}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.",
    failed: "Liste konnte nicht gelöscht werden",
    title: "Einkaufsliste löschen",
  },
  filter: {
    all: "Alle",
    allItems: "Alle Artikel",
  },
  item: {
    add: "Hinzufügen",
    addedBy: "Hinzugefügt von {name} · {date}",
    addItem: "Artikel hinzufügen",
    addPlaceholder: "Neuen Artikel hinzufügen...",
    cancelLowercase: "Abbrechen",
    deleteDescription: "Möchtest du „{name}“ wirklich löschen?",
    deleteTitle: "Artikel löschen",
    doneBy: "Erledigt von {name} · {date}",
    inputPlaceholder: "Neuen Artikel hinzufügen",
    unknownMember: "Unbekannt",
    update: "Aktualisieren",
  },
  sections: {
    last7Days: "Letzte 7 Tage",
    older: "Älter",
    today: "Heute",
  },
  validation: {
    descriptionRequired:
      "Die Beschreibung der Einkaufsliste darf nicht leer sein",
    descriptionTooLong:
      "Die Beschreibung der Einkaufsliste darf höchstens 256 Zeichen lang sein",
    iconInvalid: "Das Symbol der Einkaufsliste ist ungültig",
    iconRequired: "Das Symbol der Einkaufsliste darf nicht leer sein",
    itemNameRequired: "Der Artikelname darf nicht leer sein",
    itemNameTooLong: "Der Artikelname darf höchstens 64 Zeichen lang sein",
    nameRequired: "Name der Einkaufsliste ist erforderlich",
    nameTooLong:
      "Der Name der Einkaufsliste darf höchstens 32 Zeichen lang sein",
  },
} satisfies Messages["shoppingList"];
