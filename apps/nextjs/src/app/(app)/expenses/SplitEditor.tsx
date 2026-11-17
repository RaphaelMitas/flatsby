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
import { memberPerson } from "@flatsby/validators/expenses/formatting";
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

const TONE_TEXT = {
  default: undefined,
  destructive: "text-destructive",
  success: "text-success",
} as const;

const TONE_BAR = {
  default: "bg-primary",
  destructive: "bg-destructive",
  success: "bg-success",
} as const;

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
    validation,
    isTyped,
    progress,
    status,
    canSplitRest,
    rows,
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
    currency,
    locale,
    conversion,
  });

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
          const row = rows.get(member.id);
          const name = member.user.name;
          const shares = row?.split.shares ?? 0;

          return (
            <div key={member.id} className="flex items-center gap-3 px-3 py-2">
              <Checkbox
                checked={!!row}
                onCheckedChange={() => toggleMember(member.id)}
                aria-label={t("expenses.includeInSplit", { name })}
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3",
                  !row && "opacity-50",
                )}
              >
                <UserAvatar {...memberPerson(member)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  {!!row?.detail && (
                    <div className="text-muted-foreground text-xs">
                      {row.detail}
                    </div>
                  )}
                </div>
              </div>

              {row && method === "equal" && (
                <div className="text-right">
                  <div className="text-sm font-semibold">{row.amount}</div>
                  {row.converted && (
                    <div className="text-muted-foreground text-xs">
                      {row.converted}
                    </div>
                  )}
                </div>
              )}

              {row && method === "custom" && (
                <CurrencyInput
                  value={row.split.amountInCents}
                  onChange={(cents) => setAmount(member.id, cents)}
                  placeholder={row.placeholder}
                  min={0}
                  max={totalAmountCents}
                  className="w-28 text-right"
                  aria-label={t("expenses.amountFor", { name })}
                  data-testid={`split-member-amount-${member.id}`}
                />
              )}

              {row && method === "percentage" && (
                <div className="flex items-center gap-2">
                  <CurrencyInput
                    value={row.split.percentage ?? 0}
                    onChange={(basisPoints) =>
                      setPercentage(member.id, basisPoints)
                    }
                    placeholder={row.placeholder}
                    min={0}
                    max={10000}
                    className="w-24 text-right"
                    aria-label={t("expenses.percentageFor", { name })}
                    data-testid={`split-member-amount-${member.id}`}
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
              )}

              {row && method === "shares" && (
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

      <div className="bg-background sticky bottom-0 space-y-3 border-t py-4">
        <div className="flex min-h-9 items-center justify-between gap-2 text-sm">
          <p data-testid="split-status">
            <span className={cn("font-semibold", TONE_TEXT[status.tone])}>
              {t(status.primary.key, status.primary.values)}
            </span>
            {status.secondary && (
              <span className="text-muted-foreground">
                {` ${t(status.secondary.key, status.secondary.values)}`}
              </span>
            )}
          </p>
          {canSplitRest && (
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
                TONE_BAR[status.tone],
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
