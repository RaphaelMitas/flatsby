import type { MessageKey } from "@flatsby/i18n/message-key";
import { z } from "zod/v4";

import { msg } from "@flatsby/i18n/message-key";

import type { ConvertibleExpense } from "./conversion";
import type { ExpenseValues } from "./schemas";
import type { ExpenseSplit, SplitMethod } from "./types";
import { centsToDecimal, inLedgerCurrency } from "./conversion";
import {
  distributeEqualAmounts,
  distributePercentageAmounts,
  distributeShareAmounts,
  emptySplit,
} from "./distribution";
import { formatCurrencyFromCents, formatSplitEntry } from "./formatting";
import { expenseSchemaWithValidateSplits, splitMethodSchema } from "./schemas";
import { MAX_SHARES } from "./types";
import { validateSplits } from "./validation";

interface SplitMessage {
  key: MessageKey;
  values?: Record<string, string | number>;
}

interface SplitMoney {
  currency: string;
  locale: Intl.LocalesArgument;
}

const editableSplitMethodSchema = splitMethodSchema.exclude(["settlement"]);

export type EditableSplitMethod = z.infer<typeof editableSplitMethodSchema>;

export function editableSplitMethod(
  method: string | undefined,
): EditableSplitMethod {
  return editableSplitMethodSchema.safeParse(method).data ?? "equal";
}

export const expenseFormSchema = z.preprocess(
  (values: ExpenseValues) => ({
    ...values,
    splits: splitsForTotal(
      editableSplitMethod(values.splitMethod),
      values.splits,
      values.amountInCents,
    ),
  }),
  expenseSchemaWithValidateSplits,
);

export function splitsForTotal(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  switch (method) {
    case "equal":
      return distributeEqualAmounts(
        splits.map((s) => s.groupMemberId),
        totalAmountCents,
      );
    case "percentage":
      return distributePercentageAmounts(splits, totalAmountCents);
    case "shares":
      return distributeShareAmounts(splits, totalAmountCents, 1);
    case "custom":
      return splits.map((s) => ({
        groupMemberId: s.groupMemberId,
        amountInCents: s.amountInCents,
        percentage: null,
      }));
  }
}

export function finalizeSplits(
  method: SplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (method === "equal" || method === "shares") {
    return splitsForTotal(method, splits, totalAmountCents);
  }
  if (method === "percentage") {
    return splitsForTotal(
      method,
      splits.filter((s) => s.percentage),
      totalAmountCents,
    );
  }
  return splitsForTotal(
    "custom",
    splits.filter((s) => s.amountInCents > 0),
    totalAmountCents,
  );
}

function isTypedMethod(method: EditableSplitMethod): boolean {
  return method === "custom" || method === "percentage";
}

function splitGoal(
  method: EditableSplitMethod,
  totalAmountCents: number,
): number {
  return method === "percentage" ? 10000 : totalAmountCents;
}

function typedValue(method: EditableSplitMethod, split: ExpenseSplit): number {
  return method === "percentage"
    ? (split.percentage ?? 0)
    : split.amountInCents;
}

export function splitRemaining(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): number {
  if (!isTypedMethod(method)) return 0;
  return (
    splitGoal(method, totalAmountCents) -
    splits.reduce((sum, s) => sum + typedValue(method, s), 0)
  );
}

export function restShares(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): Map<number, number> {
  const remaining = splitRemaining(method, splits, totalAmountCents);
  if (remaining <= 0) return new Map();
  const open = splits.filter((s) => typedValue(method, s) === 0);
  const targets = open.length > 0 ? open : splits;
  return new Map(
    distributeEqualAmounts(
      targets.map((s) => s.groupMemberId),
      remaining,
    ).map((share) => [share.groupMemberId, share.amountInCents]),
  );
}

export function splitState({
  method,
  splits: storedSplits,
  totalAmountCents,
  currency,
  locale,
}: SplitMoney & {
  method: EditableSplitMethod;
  splits: ExpenseSplit[];
  totalAmountCents: number;
}) {
  const splits = splitsForTotal(method, storedSplits, totalAmountCents);
  const validation = validateSplits({ splits, totalAmountCents, method });
  const remaining = splitRemaining(method, splits, totalAmountCents);
  const goal = splitGoal(method, totalAmountCents);
  const left: SplitMessage = {
    key: remaining > 0 ? msg("expenses.splitLeft") : msg("expenses.splitOver"),
    values: {
      amount: formatSplitEntry({
        method,
        value: Math.abs(remaining),
        currency,
        locale,
      }),
    },
  };
  return {
    splits,
    validation,
    remaining,
    goal,
    isTyped: isTypedMethod(method),
    progress:
      goal > 0 ? Math.min(Math.max((goal - remaining) / goal, 0), 1) * 100 : 0,
    problem: validation.isValid
      ? undefined
      : splits.length > 0 && remaining !== 0
        ? left
        : validation.error,
    participants: finalizeSplits(method, splits, totalAmountCents),
  };
}

function splitsWithRest(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  const shares = restShares(method, splits, totalAmountCents);
  return splitsForTotal(
    method,
    splits.map((s) => {
      const value = typedValue(method, s) + (shares.get(s.groupMemberId) ?? 0);
      return method === "percentage"
        ? { ...s, percentage: value }
        : { ...s, amountInCents: value };
    }),
    totalAmountCents,
  );
}

function splitsForMethod(
  next: EditableSplitMethod,
  current: EditableSplitMethod,
  splits: ExpenseSplit[],
  totalAmountCents: number,
): ExpenseSplit[] {
  if (next === current && next !== "equal") return splits;
  return splitsForTotal(
    next,
    splits.map((s) => emptySplit(s.groupMemberId)),
    totalAmountCents,
  );
}

function splitsWithMemberToggled(
  method: EditableSplitMethod,
  splits: ExpenseSplit[],
  memberId: number,
  totalAmountCents: number,
): ExpenseSplit[] {
  const next = splits.some((s) => s.groupMemberId === memberId)
    ? splits.filter((s) => s.groupMemberId !== memberId)
    : [...splits, emptySplit(memberId)];
  return method === "equal" || method === "shares"
    ? splitsForTotal(method, next, totalAmountCents)
    : next;
}

export function splitEditor({
  splits,
  getSplits,
  setSplits,
  method,
  onMethodChange,
  totalAmountCents,
  currency,
  locale,
  conversion,
}: SplitMoney & {
  splits: ExpenseSplit[];
  getSplits: () => ExpenseSplit[];
  setSplits: (splits: ExpenseSplit[]) => void;
  method: EditableSplitMethod;
  onMethodChange: (method: EditableSplitMethod) => void;
  totalAmountCents: number;
  conversion: Pick<
    ConvertibleExpense,
    "convertedAmountInCents" | "convertedCurrency"
  >;
}) {
  const update = (fn: (current: ExpenseSplit[]) => ExpenseSplit[]) =>
    setSplits(fn(getSplits()));
  const patch = (memberId: number, change: Partial<ExpenseSplit>) =>
    getSplits().map((s) =>
      s.groupMemberId === memberId ? { ...s, ...change } : s,
    );

  const state = splitState({
    method,
    splits,
    totalAmountCents,
    currency,
    locale,
  });
  const { validation, remaining, isTyped, problem } = state;
  const rest = restShares(method, state.splits, totalAmountCents);
  const totalShares = state.splits.reduce((sum, s) => sum + (s.shares ?? 0), 0);
  const ledger = inLedgerCurrency({
    amountInCents: totalAmountCents,
    currency,
    ...conversion,
    expenseSplits: state.splits,
  });
  const showsConverted = ledger.currency !== currency && validation.isValid;
  const total = formatSplitEntry({
    method,
    value: state.goal,
    currency,
    locale,
  });
  const among: SplitMessage = {
    key: msg("expenses.splitAmong"),
    values: { count: state.splits.length },
  };
  const status: {
    primary: SplitMessage;
    secondary?: SplitMessage;
    tone: "default" | "destructive" | "success";
  } = problem
    ? {
        primary: problem,
        secondary:
          isTyped && state.splits.length > 0
            ? { key: msg("expenses.splitOfTotal"), values: { total } }
            : undefined,
        tone: remaining > 0 ? "default" : "destructive",
      }
    : isTyped
      ? {
          primary: { key: msg("expenses.splitAddsUp"), values: { total } },
          tone: "success",
        }
      : {
          primary:
            method === "shares"
              ? {
                  key: msg("expenses.sharesCount"),
                  values: { count: totalShares },
                }
              : {
                  key: msg("expenses.splitEach"),
                  values: {
                    amount: formatCurrencyFromCents({
                      cents: state.splits[0]?.amountInCents ?? 0,
                      currency,
                      locale,
                    }),
                  },
                },
          secondary: among,
          tone: "default",
        };

  return {
    ...state,
    status,
    canSplitRest: remaining > 0 && !validation.isValid,
    rows: new Map(
      state.splits.map((split, index) => {
        const amount = formatCurrencyFromCents({
          cents: split.amountInCents,
          currency,
          locale,
        });
        const converted = showsConverted
          ? formatCurrencyFromCents({
              cents: ledger.expenseSplits[index]?.amountInCents ?? 0,
              currency: ledger.currency,
              locale,
            })
          : undefined;
        return [
          split.groupMemberId,
          {
            split,
            amount,
            converted,
            detail:
              method === "equal"
                ? undefined
                : method === "custom"
                  ? converted
                  : [amount, converted].filter(Boolean).join(" · "),
            placeholder: centsToDecimal(
              rest.get(split.groupMemberId) ?? 0,
            ).toFixed(2),
          },
        ];
      }),
    ),
    changeMethod: (next: EditableSplitMethod) => {
      update((current) =>
        splitsForMethod(next, method, current, totalAmountCents),
      );
      onMethodChange(next);
    },
    toggleMember: (memberId: number) =>
      update((current) =>
        splitsWithMemberToggled(method, current, memberId, totalAmountCents),
      ),
    splitRest: () =>
      update((current) => splitsWithRest(method, current, totalAmountCents)),
    setPercentage: (memberId: number, percentage: number) =>
      setSplits(
        splitsForTotal(
          "percentage",
          patch(memberId, { percentage }),
          totalAmountCents,
        ),
      ),
    setShares: (memberId: number, shares: number) =>
      setSplits(
        splitsForTotal(
          "shares",
          patch(memberId, {
            shares: Math.min(Math.max(shares, 0), MAX_SHARES),
          }),
          totalAmountCents,
        ),
      ),
    setAmount: (memberId: number, amountInCents: number) =>
      setSplits(patch(memberId, { amountInCents })),
  };
}
