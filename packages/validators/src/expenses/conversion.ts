import { addDays } from "../calendar";
import { distributeShareAmounts } from "./distribution";

export const isExchangeRateFinal = (day: string, fetchedAt: number) =>
  fetchedAt >= Date.parse(`${addDays(day, 1)}T00:00:00Z`);

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

export function rateBetween(cents: number, convertedCents: number): number {
  return convertedCents / cents;
}

export interface ConvertibleExpense {
  amountInCents: number;
  currency: string;
  convertedAmountInCents?: number | null;
  convertedCurrency?: string | null;
  expenseSplits: { groupMemberId: number; amountInCents: number }[];
}

export function inLedgerCurrency({
  amountInCents,
  currency,
  convertedAmountInCents,
  convertedCurrency,
  expenseSplits,
}: ConvertibleExpense): Pick<
  ConvertibleExpense,
  "amountInCents" | "currency" | "expenseSplits"
> {
  if (convertedAmountInCents == null || convertedCurrency == null) {
    return { amountInCents, currency, expenseSplits };
  }
  const shares = distributeShareAmounts(
    expenseSplits
      .map((split) => ({
        groupMemberId: split.groupMemberId,
        shares: split.amountInCents,
      }))
      .sort((a, b) => a.groupMemberId - b.groupMemberId),
    convertedAmountInCents,
    0,
  );
  return {
    amountInCents: convertedAmountInCents,
    currency: convertedCurrency,
    expenseSplits: expenseSplits.map(({ groupMemberId }) => ({
      groupMemberId,
      amountInCents:
        shares.find((share) => share.groupMemberId === groupMemberId)
          ?.amountInCents ?? 0,
    })),
  };
}

interface ConversionGroup {
  currency: string;
  convertAutomatically: boolean | null;
}

export function isLeftUnconverted(
  expense: Pick<ConvertibleExpense, "currency" | "convertedCurrency"> & {
    splitMethod: string;
  },
  group: ConversionGroup,
): boolean {
  return (
    group.convertAutomatically === true &&
    expense.splitMethod !== "settlement" &&
    expense.convertedCurrency == null &&
    expense.currency !== group.currency
  );
}

export function undecidedDebtCurrencies(
  group: ConversionGroup & { thisGroupMember: { role: string } },
  balances: { currency: string }[],
): string[] | undefined {
  return group.thisGroupMember.role === "admin" &&
    group.convertAutomatically === null &&
    balances.length > 1
    ? balances.map(({ currency }) => currency)
    : undefined;
}
