import { describe, expect, it } from "vitest";

import type { FilterableExpense } from "./list-filter";
import {
  dayRangeFilter,
  matchesExpenseFilter,
  presetRange,
} from "./list-filter";

const groceries: FilterableExpense = {
  description: "Rewe Wocheneinkauf",
  paidByGroupMemberId: 1,
  expenseSplits: [{ groupMemberId: 1 }, { groupMemberId: 2 }],
  category: "food-drinks",
  splitMethod: "equal",
  expenseDate: new Date(2026, 8, 30, 23, 30),
};

const settlement: FilterableExpense = {
  ...groceries,
  description: "Ausgleich",
  category: "other",
  splitMethod: "settlement",
  expenseSplits: [{ groupMemberId: 2 }],
};

describe("matchesExpenseFilter", () => {
  it("searches descriptions case-insensitively", () => {
    expect(matchesExpenseFilter(groceries, { search: " rEWE " })).toBe(true);
    expect(matchesExpenseFilter(groceries, { search: "aldi" })).toBe(false);
  });

  it("tells paying apart from being in the split", () => {
    expect(matchesExpenseFilter(groceries, { memberId: 2 })).toBe(true);
    expect(
      matchesExpenseFilter(groceries, { memberId: 2, memberRole: "paid" }),
    ).toBe(false);
    expect(
      matchesExpenseFilter(groceries, { memberId: 1, memberRole: "split" }),
    ).toBe(true);
    expect(matchesExpenseFilter(groceries, { memberId: 3 })).toBe(false);
  });

  it("never puts a settlement in a category", () => {
    expect(matchesExpenseFilter(settlement, { category: "other" })).toBe(false);
    expect(matchesExpenseFilter(settlement, { memberId: 2 })).toBe(true);
  });

  it("includes the whole last day of a range, by device time", () => {
    const september = dayRangeFilter({ from: "2026-09-01", to: "2026-09-30" });
    expect(matchesExpenseFilter(groceries, september)).toBe(true);
    const october = dayRangeFilter({ from: "2026-10-01", to: "2026-10-31" });
    expect(matchesExpenseFilter(groceries, october)).toBe(false);
  });
});

describe("presetRange", () => {
  it("ends last month on its own last day", () => {
    expect(presetRange("last-month", "2026-03-15")).toMatchObject({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("crosses the year for the last three months", () => {
    expect(presetRange("last-3-months", "2026-01-10")).toMatchObject({
      from: "2025-11-01",
      to: "2026-01-31",
    });
  });
});
