import type { Messages } from "../../messages";

export const errors = {
  aiConsentRequired:
    "Bitte stimme der Datenweitergabe an die KI zu, bevor du den Assistenten nutzt.",
  notFound: {
    invite:
      "Diese Einladung ist abgelaufen. Bitte jemanden in der Gruppe um eine neue.",
    adminMembership: "Admin-Mitgliedschaft nicht gefunden",
    calendarItem: "Kalendereintrag nicht gefunden",
    expense: "Ausgabe nicht gefunden",
    group: "Gruppe nicht gefunden",
    groupMember: "Mitglied nicht gefunden",
    groupMembership: "Mitgliedschaft nicht gefunden",
    shoppingList: "Einkaufsliste nicht gefunden",
    shoppingListItem: "Artikel nicht gefunden",
    user: "Nutzer nicht gefunden",
  },
  empty: {
    groupName: "Der Gruppenname darf nicht leer sein",
    shoppingListItemName: "Der Artikelname darf nicht leer sein",
    shoppingListName: "Der Name der Einkaufsliste darf nicht leer sein",
  },
  mustBeGroupMember: "Du musst Mitglied dieser Gruppe sein",
  notGroupMember: "Du bist kein Mitglied dieser Gruppe",
  mustBeAdmin: "Dafür musst du Admin sein",
  adminRequiredToChangeRoles: "Nur Admins können Rollen von Mitgliedern ändern",
  adminRequiredToAddMembers:
    "Nur Admins können Mitglieder zu dieser Gruppe hinzufügen",
  onlyAdminsRemoveMembers:
    "Nur Admins können andere Mitglieder entfernen. Du kannst nur dich selbst entfernen.",
  calendarDateNotScheduled: "Dieses Datum ist nicht mehr im Plan",
  cannotRemoveLastAdmin:
    "Der letzte Admin kann nicht aus der Gruppe entfernt werden",
  promoteAdminFirst:
    "Der letzte Admin kann nicht entfernt werden. Mach zuerst ein anderes Mitglied zum Admin.",
  noExpenseAccess: "Du hast keinen Zugriff auf diese Ausgabe",
  noShoppingListAccess: "Du hast keinen Zugriff auf diese Einkaufsliste",
  unauthorized: "Du musst angemeldet sein, um darauf zuzugreifen",
  invalidInviteCode: "Das ist kein gültiger Einladungscode",
  alreadyMember: "Diese Person ist bereits Mitglied der Gruppe",
  alreadyExists: "Das gibt es bereits",
  invalidReference: "Ungültiger Verweis auf zugehörige Daten",
  fieldRequired: "{field} ist erforderlich",
  invalidName: "Bitte gib einen gültigen Namen ein",
  databaseFailed: "Datenbankvorgang fehlgeschlagen",
  serviceUnavailable: "Externer Dienst ({service}) ist gerade nicht erreichbar",
  unexpected:
    "Ein unerwarteter Fehler ist aufgetreten. Bitte versuch es später noch einmal.",
  updateRoleFailed: "Die Rolle konnte gerade nicht geändert werden",
  removeMemberFailed:
    "Das Mitglied konnte gerade nicht entfernt werden. Bitte versuch es noch einmal.",
  updateNameFailed:
    "Dein Name konnte gerade nicht geändert werden. Bitte versuch es noch einmal.",
  updateConsentFailed:
    "Deine Einwilligung konnte gerade nicht gespeichert werden. Bitte versuch es noch einmal.",
  updateAiConsentFailed:
    "Deine KI-Einwilligung konnte gerade nicht gespeichert werden. Bitte versuch es noch einmal.",
  exportDataFailed:
    "Deine Daten konnten gerade nicht exportiert werden. Bitte versuch es noch einmal.",
  conversationNotFound: "Unterhaltung nicht gefunden",
  createConversationFailed: "Unterhaltung konnte nicht erstellt werden",
  createAssistantMessageFailed: "Antwort konnte nicht erstellt werden",
  messageNotFound: "Nachricht nicht gefunden",
  messageNotInConversation: "Nachricht in dieser Unterhaltung nicht gefunden",
  notAuthorized: "Keine Berechtigung",
  outOfCredits:
    "Deine Credits sind aufgebraucht. Wechsle auf einen größeren Tarif, um weiterzumachen.",
  creditCheckFailed: "Deine Credits konnten nicht geprüft werden",
  streamFailed: "Die Antwort konnte nicht geladen werden",
  groupAccessDenied: "Gruppe nicht gefunden oder kein Zugriff",
  groupNotFound: "Gruppe nicht gefunden",
  shoppingListNotFound: "Einkaufsliste nicht gefunden",
  itemNotFound: "Artikel nicht gefunden",
  expenseNotFound: "Ausgabe nicht gefunden",
  adminAccessRequired: "Dafür brauchst du Admin-Rechte",
} satisfies Messages["errors"];
