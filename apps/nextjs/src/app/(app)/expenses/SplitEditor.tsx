"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { ConvertibleExpense } from "@flatsby/validators/expenses/conversion";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { UseFormReturn } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Checkbox } from "@flatsby/ui/checkbox";
import { Input } from "@flatsby/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  centsToDecimal,
  inLedgerCurrency,
} from "@flatsby/validators/expenses/conversion";
import {
  describeSplitProblem,
  formatCurrencyFromCents,
  formatSplitEntry,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import {
  editableSplitMethod,
  splitEditor,
} from "@flatsby/validators/expenses/split-editing";

import { CurrencyInput } from "~/components/CurrencyInput";

const SPLIT_METHODS = [
  "equal",
  "percentage",
  "shares",
  "custom",
] as const satisfies readonly EditableSplitMethod[];

interface SplitEditorProps {
  form: UseFormReturn<ExpenseValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  conversion: Pick<
    ConvertibleExpense,
    "convertedAmountInCents" | "convertedCurrency"
  >;
  onDone: () => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmountCents,
  currency,
  conversion,
  onDone,
}: SplitEditorProps) {
  const t = useTranslations();
  const locale = useLocale();
  const method = editableSplitMethod(
    useWatch({ control: form.control, name: "splitMethod" }),
  );
  const storedSplits = useWatch({ control: form.control, name: "splits" });
  const {
    splits,
    validation,
    remaining,
    goal,
    isTyped,
    progress,
    restShares,
    totalShares,
    changeMethod,
    toggleMember,
    splitRest,
    setPercentage,
    setShares,
    setAmount,
  } = splitEditor({
    splits: storedSplits,
    getSplits: () => form.getValues("splits"),
    setSplits: (next) => form.setValue("splits", next),
    method,
    onMethodChange: (next) => form.setValue("splitMethod", next),
    totalAmountCents,
  });
  const ledger = inLedgerCurrency({
    amountInCents: totalAmountCents,
    currency,
    ...conversion,
    expenseSplits: splits,
  });
  const isConverted = ledger.currency !== currency;
  const money = (cents: number) =>
    formatCurrencyFromCents({ cents, currency, locale });
  const ledgerMoney = (memberId: number) =>
    formatCurrencyFromCents({
      cents:
        ledger.expenseSplits.find((s) => s.groupMemberId === memberId)
          ?.amountInCents ?? 0,
      currency: ledger.currency,
      locale,
    });
  const total = formatSplitEntry({ method, value: goal, currency, locale });
  const problem = describeSplitProblem({
    method,
    splits,
    validation,
    remaining,
    currency,
    locale,
  });
  const people = t("expenses.peopleCount", { count: splits.length });

  return (
    <div className="space-y-4">
      <Tabs
        value={method}
        onValueChange={(value) => changeMethod(editableSplitMethod(value))}
      >
        <TabsList className="w-full">
          {SPLIT_METHODS.map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              data-testid={`split-method-${value}`}
            >
              {t(`expenses.splitMethods.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div
        className="divide-y rounded-lg border"
        data-testid="split-details-card"
      >
        {groupMembers.map((member) => {
          const split = splits.find((s) => s.groupMemberId === member.id);
          const name = member.user.name;
          const shares = split?.shares ?? 0;
          const rest = centsToDecimal(restShares.get(member.id) ?? 0);
          const amount = split ? money(split.amountInCents) : undefined;
          const converted = isConverted ? ledgerMoney(member.id) : undefined;
          const detail =
            method === "equal"
              ? undefined
              : method === "custom"
                ? converted
                : [amount, converted].filter(Boolean).join(" · ");

          return (
            <div key={member.id} className="flex items-center gap-3 px-3 py-2">
              <Checkbox
                checked={!!split}
                onCheckedChange={() => toggleMember(member.id)}
                aria-label={t("expenses.includeInSplit", { name })}
                data-testid={`split-member-${member.id}`}
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3",
                  !split && "opacity-50",
                )}
              >
                <UserAvatar {...memberPerson(member)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  {split && !!detail && (
                    <div className="text-muted-foreground text-xs">
                      {detail}
                    </div>
                  )}
                </div>
              </div>

              {split && method === "equal" && (
                <div className="text-right">
                  <div className="text-sm font-semibold">{amount}</div>
                  {converted && (
                    <div className="text-muted-foreground text-xs">
                      {converted}
                    </div>
                  )}
                </div>
              )}

              {split && method === "custom" && (
                <CurrencyInput
                  value={split.amountInCents}
                  onChange={(cents) => setAmount(member.id, cents)}
                  placeholder={rest.toFixed(2)}
                  min={0}
                  max={totalAmountCents}
                  className="w-28 text-right"
                  aria-label={t("expenses.amountFor", { name })}
                  data-testid={`split-member-amount-${member.id}`}
                />
              )}

              {split && method === "percentage" && (
                <div className="flex items-center gap-2">
                  <CurrencyInput
                    value={split.percentage ?? 0}
                    onChange={(basisPoints) =>
                      setPercentage(member.id, basisPoints)
                    }
                    placeholder={rest.toFixed(2)}
                    min={0}
                    max={10000}
                    className="w-24 text-right"
                    aria-label={t("expenses.percentageFor", { name })}
                    data-testid={`split-member-amount-${member.id}`}
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
              )}

              {split && method === "shares" && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setShares(member.id, shares - 1)}
                    disabled={shares <= 1}
                    aria-label={t("expenses.fewerSharesFor", { name })}
                    data-testid={`split-member-shares-decrement-${member.id}`}
                  >
                    <Minus />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={shares === 0 ? "" : shares}
                    onChange={(e) =>
                      setShares(
                        member.id,
                        Number.parseInt(e.target.value, 10) || 0,
                      )
                    }
                    className="w-16 text-center"
                    aria-label={t("expenses.sharesFor", { name })}
                    data-testid={`split-member-shares-${member.id}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setShares(member.id, shares + 1)}
                    aria-label={t("expenses.moreSharesFor", { name })}
                    data-testid={`split-member-shares-increment-${member.id}`}
                  >
                    <Plus />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex min-h-9 items-center justify-between gap-2 text-sm">
          <p data-testid="split-status">
            {problem ? (
              <>
                <span
                  className={cn(
                    "font-semibold",
                    remaining <= 0 && "text-destructive",
                  )}
                >
                  {t(problem.key, problem.values)}
                </span>
                {isTyped && splits.length > 0 && (
                  <span className="text-muted-foreground">
                    {` ${t("expenses.splitOfTotal", { total })}`}
                  </span>
                )}
              </>
            ) : isTyped ? (
              <span className="text-success font-semibold">
                {t("expenses.splitAddsUp", { total })}
              </span>
            ) : (
              <>
                <span className="font-semibold">
                  {method === "shares"
                    ? t("expenses.sharesCount", { count: totalShares })
                    : t("expenses.splitEach", {
                        amount: money(splits[0]?.amountInCents ?? 0),
                      })}
                </span>
                <span className="text-muted-foreground">{` · ${people}`}</span>
              </>
            )}
          </p>
          {remaining > 0 && !validation.isValid && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={splitRest}
              data-testid="split-rest"
            >
              {t("expenses.splitRest")}
            </Button>
          )}
        </div>
        {isTyped && (
          <div className="bg-muted h-1 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-1 rounded-full transition-all",
                remaining < 0
                  ? "bg-destructive"
                  : validation.isValid
                    ? "bg-success"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <Button
          type="button"
          className="w-full"
          onClick={onDone}
          disabled={!validation.isValid}
          data-testid="split-done"
        >
          {t("common.done")}
        </Button>
      </div>
    </div>
  );
}
