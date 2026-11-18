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
  more: "+{count} weitere",
  nothingToBuy: "Nichts zu kaufen",
  open: "{count} offen",
  itemsBought: "{count, plural, one {Artikel gekauft} other {Artikel gekauft}}",
  choresDone:
    "{count, plural, one {Aufgabe erledigt} other {Aufgaben erledigt}}",
  pace: {
    less: "<b>{amount} weniger</b> als zu dieser Zeit im {month}",
    more: "<b>{amount} mehr</b> als zu dieser Zeit im {month}",
    same: "<b>Genauso viel</b> wie zu dieser Zeit im {month}",
  },
  cat: {
    sitting: "Du schaffst das.",
    peeking: "Fast geschafft.",
    asleep: "Fünf Minuten noch.",
    snore: "z",
  },
} satisfies Messages["home"];
