import type { Messages } from "../../messages";

export const expenses = {
  settlement: "Ausgleich",
  paidBy: "Bezahlt von {name}",
  splitBetween: "Aufgeteilt auf {count, plural, one {# Person} other {# Personen}}",
} satisfies Messages["expenses"];
