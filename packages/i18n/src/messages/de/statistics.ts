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
  yourShareBy: "Dein Anteil bis {date}",
  ofHousehold: "von <b>{amount}</b>, die der Haushalt ausgegeben hat",
  wholeMonth: {
    less: "<b>{amount} weniger</b> als im {month}",
    more: "<b>{amount} mehr</b> als im {month}",
    same: "<b>Gleich viel</b> wie im {month}",
  },
  byDay: {
    less: "<b>{amount} weniger</b> als bis {date}",
    more: "<b>{amount} mehr</b> als bis {date}",
    same: "<b>Gleich viel</b> wie bis {date}",
    before: "Bis {date} waren es <b>{amount}</b>",
  },
  whereItWent: "Wofür",
  ofYourShare: "{percent} von deinem Anteil",
  ofItemsBought:
    "von {count, plural, one {# gekauften Artikel} other {# gekauften Artikeln}}",
  householdAmount: "{amount} im Haushalt",
  monthByMonth: "Monat für Monat",
  you: "du",
  household: "Haushalt",
  chores: "Aufgaben",
  daysOnList:
    "Steht meist <b>{count, plural, one {# Tag} other {# Tage}}</b> auf der Liste, bis es gekauft wird",
  times: "{count}×",
  empty: {
    title: "Noch nichts zu sehen",
    description:
      "Trag eine Ausgabe ein, kauf etwas von einer Liste oder hake eine Aufgabe ab, dann erscheinen hier die Zahlen.",
  },
} satisfies Messages["statistics"];
