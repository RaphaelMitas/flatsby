// ============================================================================
// Formatting Utilities - Currency and Date Display
// ============================================================================

import type { CounterpartDebts } from "./debt";
import type { PairActivityItem } from "./schemas";
import type { DebtEntry, GroupDebtSummary, SettleSource } from "./types";
import { centsToDecimal } from "./conversion";

/**
 * Format currency amount with currency symbol
 * @param params.amountDecimal - Amount in decimal (not cents)
 * @param params.currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param params.locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "$10.50" or "€10.50")
 */
export function formatCurrency({
  amountDecimal,
  currency,
  locale = "en-US",
}: {
  amountDecimal: number;
  currency: string;
  locale?: Intl.LocalesArgument;
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
 * @param params.locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string
 */
export function formatCurrencyFromCents({
  cents,
  currency,
  locale,
}: {
  cents: number;
  currency: string;
  locale?: Intl.LocalesArgument;
}): string {
  return formatCurrency({
    amountDecimal: centsToDecimal(cents),
    currency,
    locale,
  });
}

/**
 * Format an expense date for list and card views
 * The year is omitted for expenses in the current year to keep rows compact.
 * @param date - Date the expense was incurred
 * @param locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "Mar 4" or "Mar 4, 2024")
 */
export function formatExpenseDateShort(
  date: Date,
  locale: Intl.LocalesArgument = "en-US",
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
 * @param locale - Locale to use for formatting (default: "en-US")
 * @returns Formatted string (e.g., "Monday, March 4, 2024")
 */
export function formatExpenseDateLong(
  date: Date,
  locale: Intl.LocalesArgument = "en-US",
): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatShareCount(count: number): string {
  return `${count} ${count === 1 ? "share" : "shares"}`;
}

export function formatSplitPortion({
  split,
  expense,
}: {
  split: { amountInCents: number; shares?: number | null };
  expense: {
    amountInCents: number;
    splitMethod: string;
    expenseSplits: { shares?: number | null }[];
  };
}): string {
  if (expense.splitMethod === "shares") {
    const totalShares = expense.expenseSplits.reduce(
      (sum, s) => sum + (s.shares ?? 0),
      0,
    );
    return `${split.shares ?? 0} of ${formatShareCount(totalShares)}`;
  }
  const percentage =
    expense.amountInCents === 0
      ? 0
      : (split.amountInCents / expense.amountInCents) * 100;
  return `${percentage.toFixed(1)}%`;
}

export interface DebtPerson {
  name: string;
  image: string | null;
}

export type PersonLookup = (groupMemberId: number) => DebtPerson;

export function personLookup(
  members: { id: number; user: { name: string; image?: string | null } }[],
  meId: number,
): PersonLookup {
  const byId = new Map(members.map((member) => [member.id, member]));
  return (groupMemberId) => {
    const user = byId.get(groupMemberId)?.user;
    return {
      name: groupMemberId === meId ? "You" : (user?.name ?? "Unknown"),
      image: user?.image ?? null,
    };
  };
}

export function formatSignedCents(cents: number, currency: string): string {
  return `${cents > 0 ? "+" : ""}${formatCurrencyFromCents({ cents, currency })}`;
}

/** "Max", "Max and Sophie", "Lena, Max and Sophie" */
function joinNames(names: string[]): string {
  const last = names.at(-1);
  if (names.length < 2 || last === undefined) return last ?? "";
  return `${names.slice(0, -1).join(", ")} and ${last}`;
}

export function debtHero(
  summary: GroupDebtSummary,
  meId: number,
  counterparts: CounterpartDebts[],
  person: PersonLookup,
) {
  const lines = Object.entries(summary.memberBalances[meId] ?? {})
    .filter(([, cents]) => cents !== 0)
    .map(([currency, cents]) => ({ currency, cents }));
  const mixed = new Set(lines.map(({ cents }) => Math.sign(cents))).size > 1;
  const first = lines[0];
  const fallbackCurrency = Object.keys(summary.currencies)[0] ?? "EUR";

  const namesWhere = (sign: 1 | -1) =>
    counterparts
      .filter(({ amounts }) =>
        amounts.some(({ amountInCents }) => amountInCents * sign > 0),
      )
      .map(({ groupMemberId }) => person(groupMemberId).name);
  const owedBy = namesWhere(1);
  const owing = namesWhere(-1);
  const meta: string[] = [];
  if (owedBy.length > 0) {
    meta.push(
      `${joinNames(owedBy)} ${owedBy.length === 1 ? "owes" : "owe"} you`,
    );
  }
  if (owing.length > 0) {
    meta.push(`${meta.length > 0 ? "you" : "You"} owe ${joinNames(owing)}`);
  }

  return {
    label:
      !first || mixed
        ? "Overall"
        : first.cents > 0
          ? "Overall you are owed"
          : "Overall you owe",
    amounts: (first ? lines : [{ currency: fallbackCurrency, cents: 0 }]).map(
      ({ currency, cents }) => ({
        currency,
        cents,
        text: mixed
          ? formatSignedCents(cents, currency)
          : formatCurrencyFromCents({ cents: Math.abs(cents), currency }),
      }),
    ),
    meta: meta.join(", ") || "You don't owe anyone and nobody owes you",
  };
}

export function formatOthersWithDebts(
  summary: GroupDebtSummary,
  meId: number,
  person: PersonLookup,
): string {
  const names = Object.entries(summary.memberBalances)
    .filter(
      ([id, balances]) =>
        Number(id) !== meId &&
        Object.values(balances).some((cents) => cents !== 0),
    )
    .map(([id]) => person(Number(id)).name);
  return `${joinNames(names)} ${names.length === 1 ? "still has" : "still have"} open debts`;
}

export function describePairActivity(
  item: PairActivityItem,
  meId: number,
  person: PersonLookup,
) {
  const paidByMe = item.paidByGroupMemberId === meId;
  const payer = person(item.paidByGroupMemberId).name;
  const date = formatExpenseDateShort(item.expenseDate);
  const paid = formatCurrencyFromCents({
    cents: item.amountInCents,
    currency: item.currency,
  });
  return {
    cents: paidByMe ? item.pairAmountInCents : -item.pairAmountInCents,
    title: item.isSettlement ? `${payer} settled up` : item.description,
    subtitle: item.isSettlement
      ? date
      : `${date} · ${paidByMe ? "you" : payer} paid ${paid}`,
  };
}

export function settleOutstandingLabel(
  source: SettleSource,
  debt: DebtEntry,
  meId: number,
  person: PersonLookup,
): string {
  if (source === "plan") return "Settle plan payment";
  const from = person(debt.fromGroupMemberId).name;
  const to = person(debt.toGroupMemberId).name;
  if (debt.toGroupMemberId === meId) return `${from} owes you directly`;
  if (debt.fromGroupMemberId === meId) return `You owe ${to} directly`;
  return `${from} owes ${to} directly`;
}
