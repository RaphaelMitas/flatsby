import type { Messages } from "../../messages";

export const home = {
  catLabel: "Flatsby-Katze",
  createGroup: "Gruppe erstellen",
  retry: "Erneut versuchen",
  somethingWentWrong: "Etwas ist schiefgelaufen",
  greeting: {
    morning: "Guten Morgen, {name}.",
    afternoon: "Hallo, {name}.",
    evening: "Guten Abend, {name}.",
  },
  nothingToBuy: "Nichts zu kaufen",
  open: "{count} offen",
  itemsBought: "{count, plural, one {Artikel gekauft} other {Artikel gekauft}}",
  choresDone:
    "{count, plural, one {Aufgabe erledigt} other {Aufgaben erledigt}}",
  firstDay: {
    expenses: {
      title: "Noch nichts ausgegeben",
      body: "Deine erste Ausgabe erscheint hier, und ab nächstem Monat der Vergleich.",
    },
    shopping: {
      title: "Noch nichts gekauft",
      body: "Was ihr abhakt, wird hier gezählt.",
    },
    calendar: {
      title: "Noch keine Aufgaben erledigt",
      body: "Trag wiederkehrende Aufgaben in den Kalender ein und wechselt euch ab.",
    },
  },
  pace: {
    less: "<b>{amount} weniger</b> als um diese Zeit im {month}",
    more: "<b>{amount} mehr</b> als um diese Zeit im {month}",
    same: "<b>Gleich viel</b> wie um diese Zeit im {month}",
  },
  cat: {
    sitting: "Du schaffst das.",
    peeking: "Fast geschafft.",
    asleep: "Fünf Minuten noch.",
    snore: "z",
  },
} satisfies Messages["home"];
