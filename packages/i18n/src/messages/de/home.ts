import type { Messages } from "../../messages";

export const home = {
  catLabel: "Flatsby-Katze",
  createGroup: "Gruppe erstellen",
  loadingDashboard: "Übersicht wird geladen...",
  retry: "Erneut versuchen",
  selectGroup: "Gruppe auswählen",
  shoppingLists: "Einkaufslisten",
  somethingWentWrong: "Etwas ist schiefgelaufen",
  quickActions: {
    expense: "Ausgabe",
    shop: "Einkaufen",
    title: "Schnellaktionen",
  },
  stats: {
    balanced: "ausgeglichen",
    items: "Artikel",
    last30Days: "Letzte 30 Tage",
    messages: "Nachrichten",
    owedToYou: "bekommst du",
    spent: "ausgegeben",
    youOwe: "schuldest du",
  },
} satisfies Messages["home"];
