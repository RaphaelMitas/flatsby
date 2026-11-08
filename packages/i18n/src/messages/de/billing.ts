import type { Messages } from "../../messages";

export const billing = {
  title: "Abrechnung",
  nothingToManage: "Hier gibt es nichts zu verwalten, Flatsby ist kostenlos.",
  support: {
    title: "Flatsby unterstützen",
    free: "Alles, was in Flatsby heute kostenlos ist, bleibt kostenlos: Listen, Ausgaben, Putzplan, Ausgleichen, Belegscan (Beta), automatische Kategorien, Export und Import. Keine Werbung, keine Mitgliedergrenze. KI-Funktionen haben ein monatliches Fair-Use-Limit weit über normaler Nutzung. Was je etwas kostet, käme nur neu dazu.",
    shutdown:
      "Falls Flatsby je eingestellt wird, erfährst du es 90 Tage vorher per E-Mail und in der App, und jedes Mitglied kann die Ausgaben und Salden der Gruppe herunterladen.",
    cost: "Flatsby wird von einer Person in Darmstadt gebaut, und der Betrieb kostet etwa 10 Euro im Monat.",
    chipIn:
      "Es gibt nichts zu kaufen. Wenn du irgendwann etwas beitragen möchtest, schreib mir:",
  },
} satisfies Messages["billing"];
