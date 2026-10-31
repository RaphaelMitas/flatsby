import type { Translate } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import type { ExpenseCategoryGroup } from "./categories";
import type { SplitMethod } from "./types";
import {
  addDays,
  formatCalendarDate,
  monthOf,
  pickerDate,
  shiftMonth,
} from "../calendar";
import { expenseCategoryGroups } from "./categories";
import { MAX_EXPENSE_DESCRIPTION_LENGTH } from "./types";

export const memberRoles = ["any", "paid", "split"] as const;
export type MemberRole = (typeof memberRoles)[number];

/** Every field is optional so released apps, which send none, keep getting the whole list. */
export const expenseListFilterSchema = z.object({
  search: z.string().trim().max(MAX_EXPENSE_DESCRIPTION_LENGTH).optional(),
  memberId: z.number().int().optional(),
  memberRole: z.enum(memberRoles).optional(),
  category: z.enum(expenseCategoryGroups).optional(),
  from: z.date().optional(),
  to: z.date().optional(),
});

export type ExpenseListFilter = z.infer<typeof expenseListFilterSchema>;

export interface FilterableExpense {
  description: string;
  paidByGroupMemberId: number;
  expenseSplits: { groupMemberId: number }[];
  category: ExpenseCategoryGroup;
  splitMethod: SplitMethod | string;
  expenseDate: Date;
}

/** The client-side twin of getGroupExpenses' WHERE clause; keep the two in step. */
export function matchesExpenseFilter(
  expense: FilterableExpense,
  filter: ExpenseListFilter,
) {
  const search = filter.search?.trim().toLocaleLowerCase();
  if (search && !expense.description.toLocaleLowerCase().includes(search)) {
    return false;
  }
  if (filter.memberId !== undefined) {
    const paid = expense.paidByGroupMemberId === filter.memberId;
    const inSplit = expense.expenseSplits.some(
      (split) => split.groupMemberId === filter.memberId,
    );
    const role = filter.memberRole ?? "any";
    if (role === "paid" && !paid) return false;
    if (role === "split" && !inSplit) return false;
    if (role === "any" && !paid && !inSplit) return false;
  }
  if (
    filter.category &&
    (expense.splitMethod === "settlement" ||
      expense.category !== filter.category)
  ) {
    return false;
  }
  const date = new Date(expense.expenseDate);
  if (filter.from && date < filter.from) return false;
  if (filter.to && date >= filter.to) return false;
  return true;
}

export const isExpenseFilterActive = (filter: ExpenseListFilter) =>
  !!filter.search?.trim() ||
  filter.memberId !== undefined ||
  filter.category !== undefined ||
  filter.from !== undefined ||
  filter.to !== undefined;

export const datePresets = [
  "this-month",
  "last-month",
  "last-3-months",
  "this-year",
  "last-year",
] as const;
export type DatePreset = (typeof datePresets)[number];

/** Inclusive calendar days on the device, like the date pickers use. */
export interface DayRange {
  from: string;
  to: string;
  preset?: DatePreset;
}

export function presetRange(preset: DatePreset, today: string): DayRange {
  const month = monthOf(today);
  const year = Number(today.slice(0, 4));
  switch (preset) {
    case "this-month":
      return { from: `${month}-01`, to: today, preset };
    case "last-month":
      return {
        from: `${shiftMonth(month, -1)}-01`,
        to: addDays(`${month}-01`, -1),
        preset,
      };
    case "last-3-months":
      return { from: `${shiftMonth(month, -2)}-01`, to: today, preset };
    case "this-year":
      return { from: `${year}-01-01`, to: today, preset };
    case "last-year":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, preset };
  }
}

export const dayRangeFilter = (range: DayRange) => ({
  from: pickerDate(range.from),
  to: pickerDate(addDays(range.to, 1)),
});

export function describeDayRange(
  range: DayRange,
  today: string,
  locale: Intl.LocalesArgument,
  t: Translate,
) {
  const format = (date: string, withYear: boolean) =>
    formatCalendarDate(date, locale, {
      day: "numeric",
      month: "short",
      ...(withYear && { year: "numeric" }),
    });
  const thisYear = today.slice(0, 4);
  const toYear = range.to.slice(0, 4);
  if (range.from === range.to) return format(range.from, toYear !== thisYear);
  if (range.to === today) {
    return t("expenses.filter.rangeSince", {
      date: format(range.from, range.from.slice(0, 4) !== thisYear),
    });
  }
  return t("expenses.filter.rangeBetween", {
    from: format(range.from, range.from.slice(0, 4) !== toYear),
    to: format(range.to, toYear !== thisYear),
  });
}

export function dayRangeLabel(
  range: DayRange,
  today: string,
  locale: Intl.LocalesArgument,
  t: Translate,
) {
  if (range.preset === "last-year") return range.from.slice(0, 4);
  if (range.preset) return t(`expenses.filter.presets.${range.preset}`);
  return describeDayRange(range, today, locale, t);
}

export interface ExpenseFilterChoice {
  memberId?: number;
  memberRole: MemberRole;
  category?: ExpenseCategoryGroup;
  range?: DayRange;
}

export function filterChipLabels(
  choice: ExpenseFilterChoice,
  people: { id: number; user: { name: string } }[],
  today: string,
  locale: Intl.LocalesArgument,
  t: Translate,
) {
  const memberId = choice.memberId;
  const name =
    memberId === undefined
      ? undefined
      : (people.find((person) => person.id === memberId)?.user.name ??
        t("common.unknown"));
  return {
    member:
      name === undefined || choice.memberRole === "any"
        ? name
        : t(
            choice.memberRole === "paid"
              ? "expenses.filter.memberPaid"
              : "expenses.filter.memberSplit",
            { name },
          ),
    category:
      choice.category && t(`expenseCategories.groups.${choice.category}`),
    range: choice.range && dayRangeLabel(choice.range, today, locale, t),
  };
}
