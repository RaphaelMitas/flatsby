import type { Messages } from "../../messages";

export const statistics = {
  title: "Statistik",
  ranges: {
    title: "Zeitraum",
    thisMonth: "Dieser Monat",
    lastMonth: "Letzter Monat",
    last3Months: "Letzte 3 Monate",
    thisYear: "Dieses Jahr",
    sinceJoined: "Seit deinem Einzug",
  },
  yourShare: "Dein Anteil",
  ofHousehold: "von insgesamt <b>{amount}</b> im Haushalt.",
  wholeMonth: {
    less: "<b>{amount} weniger</b> als im {month}",
    more: "<b>{amount} mehr</b> als im {month}",
    same: "<b>Gleich viel</b> wie im {month}",
  },
  whereItWent: "Wofür",
  householdAmount: "{amount} Haushalt",
  monthByMonth: "Monat für Monat",
  you: "du",
  household: "Haushalt",
  chores: "Aufgaben",
  daysOnList:
    "Meist innerhalb von <b>{count, plural, one {# Tag} other {# Tagen}}</b> gekauft, nachdem es auf der Liste stand",
  times: "{count}×",
  empty: {
    title: "Noch nichts zu sehen",
    description:
      "Trag eine Ausgabe ein, kauf etwas von einer Liste oder hake eine Aufgabe ab, dann erscheinen hier die Zahlen.",
  },
} satisfies Messages["statistics"];
