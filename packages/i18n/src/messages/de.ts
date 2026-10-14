import type { Messages } from "../messages";

export const de = {
  errors: {
    aiConsentRequired:
      "Bitte stimme der Datenweitergabe an die KI zu, bevor du den Assistenten nutzt.",
  },
  settings: {
    language: {
      title: "Sprache",
      description:
        "Wähle die Sprache, in der Flatsby in diesem Browser angezeigt wird.",
      system: "Wie im Browser",
    },
  },
  expenses: {
    settlement: "Ausgleich",
    paidBy: "Bezahlt von {name}",
    splitBetween:
      "Aufgeteilt auf {count, plural, one {# Person} other {# Personen}}",
  },
} satisfies Messages;
