// ============================================================================
// Formatting Utilities - Currency and Date Display
// ============================================================================

import type { Translate } from "@flatsby/i18n/message-key";

import type { ConvertibleExpense } from "./conversion";
import type { DebtKind } from "./debt";
import type { PairActivityItem } from "./schemas";
import type { DebtEntry, GroupDebtSummary } from "./types";
import { centsToDecimal, rateBetween } from "./conversion";
import { debtsBetweenOthers } from "./debt";

/**
 * Format currency amount with currency symbol
 * @param params.amountDecimal - Amount in decimal (not cents)
 * @param params.currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param params.locale - Locale to use for formatting
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency({
  amountDecimal,
  currency,
  locale,
}: {
  amountDecimal: number;
  currency: string;
  locale: Intl.LocalesArgument;
}): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountDecimal);
}

/**
 * Format currency amount from cents
 * @param params.cents - Amount in cents
 * @param params.currency - ISO 4217 currency code
 * @param params.locale - Locale to use for formatting
 * @returns Formatted string
 */
export function formatCurrencyFromCents({
  cents,
  currency,
  locale,
}: {
  cents: number;
  currency: string;
  locale: Intl.LocalesArgument;
}): string {
  return formatCurrency({
    amountDecimal: centsToDecimal(cents),
    currency,
    locale,
  });
}

/** The amount an expense counts as first, and what was actually paid when that differs */
export function formatExpenseAmounts(
  expense: Pick<
    ConvertibleExpense,
    | "amountInCents"
    | "currency"
    | "convertedAmountInCents"
    | "convertedCurrency"
  >,
  locale: Intl.LocalesArgument,
): { amount: string; paid?: string; rate?: string } {
  const paid = formatCurrencyFromCents({
    cents: expense.amountInCents,
    currency: expense.currency,
    locale,
  });
  if (
    expense.convertedAmountInCents == null ||
    expense.convertedCurrency == null
  ) {
    return { amount: paid };
  }
  return {
    amount: formatCurrencyFromCents({
      cents: expense.convertedAmountInCents,
      currency: expense.convertedCurrency,
      locale,
    }),
    paid,
    rate: formatRate(
      expense.currency,
      expense.convertedCurrency,
      rateBetween(expense.amountInCents, expense.convertedAmountInCents),
      locale,
    ),
  };
}

export function formatRate(
  from: string,
  to: string,
  rate: number,
  locale: Intl.LocalesArgument,
): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(rate);
  return `1 ${from} = ${formatted} ${to}`;
}

/**
 * Format an expense date for list and card views
 * The year is omitted for expenses in the current year to keep rows compact.
 * @param date - Date the expense was incurred
 * @param locale - Locale to use for formatting
 * @returns Formatted string (e.g., "Mar 4" or "Mar 4, 2024")
 */
export function formatExpenseDateShort(
  date: Date,
  locale: Intl.LocalesArgument,
): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format an expense date for detail views
 * @param date - Date the expense was incurred
 * @param locale - Locale to use for formatting
 * @returns Formatted string (e.g., "Monday, March 4, 2024")
 */
export function formatExpenseDateLong(
  date: Date,
  locale: Intl.LocalesArgument,
): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatSplitPortion({
  split,
  expense,
  t,
  locale,
}: {
  split: { amountInCents: number; shares?: number | null };
  expense: {
    amountInCents: number;
    splitMethod: string;
    expenseSplits: { shares?: number | null }[];
  };
  t: Translate;
  locale: Intl.LocalesArgument;
}): string {
  if (expense.splitMethod === "shares") {
    const totalShares = expense.expenseSplits.reduce(
      (sum, s) => sum + (s.shares ?? 0),
      0,
    );
    return t("expenses.sharesOfTotal", {
      shares: split.shares ?? 0,
      count: totalShares,
    });
  }
  const fraction =
    expense.amountInCents === 0
      ? 0
      : split.amountInCents / expense.amountInCents;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(fraction);
}

export interface DebtPerson {
  name: string;
  image: string | null;
  placeholder?: boolean;
}

export type PersonLookup = (groupMemberId: number) => DebtPerson;

export function personLookup(
  members: {
    id: number;
    userId: string | null;
    user: { name: string; image?: string | null };
  }[],
  meId: number,
  t: Translate,
): PersonLookup {
  const byId = new Map(members.map((member) => [member.id, member]));
  return (groupMemberId) => {
    const member = byId.get(groupMemberId);
    return {
      name:
        groupMemberId === meId
          ? t("debts.you")
          : (member?.user.name ?? t("common.unknown")),
      image: member?.user.image ?? null,
      placeholder: member?.userId === null,
    };
  };
}

export function formatSignedCents(
  cents: number,
  currency: string,
  locale: Intl.LocalesArgument,
): string {
  return `${cents > 0 ? "+" : ""}${formatCurrencyFromCents({ cents, currency, locale })}`;
}

/** "Max", "Max and Sophie", "Lena, Max and Sophie" */
function joinNames(names: string[], t: Translate): string {
  const last = names.at(-1);
  if (names.length < 2 || last === undefined) return last ?? "";
  return t("debts.nameList", { names: names.slice(0, -1).join(", "), last });
}

export function listCurrencies(
  currencies: string[],
  first: string,
  t: Translate,
): string {
  return joinNames(
    [...currencies].sort((a, b) => Number(b === first) - Number(a === first)),
    t,
  );
}

export function debtHero(
  summary: GroupDebtSummary,
  meId: number,
  t: Translate,
  locale: Intl.LocalesArgument,
) {
  const lines = Object.entries(summary.memberBalances[meId] ?? {})
    .filter(([, cents]) => cents !== 0)
    .map(([currency, cents]) => ({ currency, cents }));
  const mixed = new Set(lines.map(({ cents }) => Math.sign(cents))).size > 1;
  const first = lines[0];
  const fallbackCurrency = Object.keys(summary.currencies)[0] ?? "EUR";

  return {
    label:
      !first || mixed
        ? t("debts.overall")
        : first.cents > 0
          ? t("debts.overallOwed")
          : t("debts.overallOwe"),
    amounts: (first ? lines : [{ currency: fallbackCurrency, cents: 0 }]).map(
      ({ currency, cents }) => ({
        currency,
        cents,
        text: mixed
          ? formatSignedCents(cents, currency, locale)
          : formatCurrencyFromCents({
              cents: Math.abs(cents),
              currency,
              locale,
            }),
      }),
    ),
  };
}

export function allSquareMessage(
  summary: GroupDebtSummary,
  meId: number,
  kind: DebtKind,
  person: PersonLookup,
  t: Translate,
): string {
  if (kind === "simplified") return t("debts.nothingToSettle");
  const names = [
    ...new Set(
      debtsBetweenOthers(summary, meId, "direct").flatMap((debt) => [
        debt.fromGroupMemberId,
        debt.toGroupMemberId,
      ]),
    ),
  ].map((id) => person(id).name);
  return t("debts.othersStillOwe", { names: joinNames(names, t) });
}

export function describePairActivity(
  item: PairActivityItem,
  meId: number,
  person: PersonLookup,
  t: Translate,
  locale: Intl.LocalesArgument,
) {
  const paidByMe = item.paidByGroupMemberId === meId;
  const payer = person(item.paidByGroupMemberId).name;
  const date = formatExpenseDateShort(item.expenseDate, locale);
  const amount = formatCurrencyFromCents({
    cents: item.amountInCents,
    currency: item.currency,
    locale,
  });
  return {
    cents: paidByMe ? item.pairAmountInCents : -item.pairAmountInCents,
    title: item.isSettlement
      ? t("debts.settledUp", { name: payer })
      : item.description,
    subtitle: item.isSettlement
      ? date
      : paidByMe
        ? t("debts.youPaidOn", { date, amount })
        : t("debts.otherPaidOn", { date, name: payer, amount }),
  };
}

export function settleOutstandingLabel(
  source: DebtKind,
  debt: DebtEntry,
  meId: number,
  person: PersonLookup,
  t: Translate,
): string {
  if (source === "simplified") return t("debts.simplifiedPayment");
  const from = person(debt.fromGroupMemberId).name;
  const to = person(debt.toGroupMemberId).name;
  if (debt.toGroupMemberId === meId) {
    return t("debts.owesYouDirectly", { name: from });
  }
  if (debt.fromGroupMemberId === meId) {
    return t("debts.youOweDirectly", { name: to });
  }
  return t("debts.owesDirectly", { from, to });
}
