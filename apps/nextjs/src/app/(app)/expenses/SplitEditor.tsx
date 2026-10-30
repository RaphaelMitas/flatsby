"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { ConvertibleExpense } from "@flatsby/validators/expenses/conversion";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { LucideIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Divide, DollarSign, Equal, Minus, Percent, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useWatch } from "react-hook-form";

import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Input } from "@flatsby/ui/input";
import { Separator } from "@flatsby/ui/separator";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { inLedgerCurrency } from "@flatsby/validators/expenses/conversion";
import {
  formatCurrencyFromCents,
  memberPerson,
} from "@flatsby/validators/expenses/formatting";
import { splitEditor } from "@flatsby/validators/expenses/split-editing";

import { CurrencyInput } from "~/components/CurrencyInput";

const SPLIT_METHOD_OPTIONS = [
  { method: "equal", Icon: Equal },
  { method: "percentage", Icon: Percent },
  { method: "shares", Icon: Divide },
  { method: "custom", Icon: DollarSign },
] as const satisfies readonly {
  method: EditableSplitMethod;
  Icon: LucideIcon;
}[];

interface SplitEditorProps {
  form: UseFormReturn<ExpenseValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  conversion: Pick<
    ConvertibleExpense,
    "convertedAmountInCents" | "convertedCurrency"
  >;
  splitMethod: EditableSplitMethod;
  onSplitMethodChange: (method: EditableSplitMethod) => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmountCents,
  currency,
  conversion,
  splitMethod,
  onSplitMethodChange,
}: SplitEditorProps) {
  const t = useTranslations();
  const locale = useLocale();
  const splits = useWatch({ control: form.control, name: "splits" });
  const ledger = inLedgerCurrency({
    amountInCents: totalAmountCents,
    currency,
    ...conversion,
    expenseSplits: splits,
  });
  const isConverted = ledger.currency !== currency;
  const selectedMemberIds = splits.map((s) => s.groupMemberId);
  const {
    validation,
    totalSplitCents,
    totalShares,
    changeMethod,
    toggleMember,
    setPercentage,
    setShares,
    setAmount,
  } = splitEditor({
    splits,
    getSplits: () => form.getValues("splits"),
    setSplits: (next) =>
      form.setValue("splits", next, { shouldValidate: true }),
    method: splitMethod,
    onMethodChange: onSplitMethodChange,
    totalAmountCents,
  });

  return (
    <div className="space-y-4">
      <div className="@container">
        <div className="grid grid-cols-2 gap-2 @md:flex">
          {SPLIT_METHOD_OPTIONS.map(({ method, Icon }) => (
            <Button
              key={method}
              type="button"
              variant={splitMethod === method ? "default" : "outline"}
              size="sm"
              onClick={() => changeMethod(method)}
              className="grow"
              data-testid={`split-method-${method}`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {t(`expenses.splitMethods.${method}`)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("expenses.selectPeople")}
          </CardTitle>
          <CardDescription>{t("expenses.selectPeopleHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {groupMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <Button
                  key={member.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => toggleMember(member.id)}
                  className="flex h-auto flex-col items-center gap-2 py-3"
                  data-testid={`split-member-${member.id}`}
                >
                  <UserAvatar {...memberPerson(member)} />
                  <span className="w-full truncate text-xs">
                    {member.user.name}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {splits.length > 0 && (
        <Card data-testid="split-details-card">
          <CardHeader>
            <CardTitle className="text-base">
              {t("expenses.splitDetails")}
            </CardTitle>
            <CardDescription>
              {splitMethod === "equal" && t("expenses.splitHintEqual")}
              {splitMethod === "percentage" &&
                t("expenses.splitHintPercentage")}
              {splitMethod === "shares" &&
                t("expenses.splitHintShares", { count: totalShares })}
              {splitMethod === "custom" &&
                t("expenses.splitHintCustom", {
                  amount: formatCurrencyFromCents({
                    cents: totalAmountCents,
                    currency,
                    locale,
                  }),
                })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {splits.map((split, index) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? t("common.unknown");
              const shares = split.shares ?? 0;

              return (
                <div key={split.groupMemberId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      {...(member
                        ? memberPerson(member)
                        : { name: memberName })}
                      size="sm"
                    />
                    <span className="flex-1 text-sm font-medium">
                      {memberName}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCurrencyFromCents({
                        cents: split.amountInCents,
                        currency,
                        locale,
                      })}
                    </span>
                    {isConverted && (
                      <span className="text-muted-foreground text-sm">
                        {formatCurrencyFromCents({
                          cents:
                            ledger.expenseSplits[index]?.amountInCents ?? 0,
                          currency: ledger.currency,
                          locale,
                        })}
                      </span>
                    )}
                  </div>

                  {splitMethod === "percentage" && (
                    <div className="flex items-center gap-2">
                      <CurrencyInput
                        value={split.percentage ?? 0}
                        onChange={(basisPoints) =>
                          setPercentage(index, basisPoints)
                        }
                        placeholder="0.00"
                        min={0}
                        max={10000}
                        className="flex-1"
                        data-testid={`split-member-amount-${split.groupMemberId}`}
                      />
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShares(index, shares - 1)}
                        disabled={shares <= 1}
                        aria-label={t("expenses.fewerSharesFor", {
                          name: memberName,
                        })}
                        data-testid={`split-member-shares-decrement-${split.groupMemberId}`}
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
                            index,
                            Number.parseInt(e.target.value, 10) || 0,
                          )
                        }
                        className="w-16 text-center"
                        aria-label={t("expenses.sharesFor", {
                          name: memberName,
                        })}
                        data-testid={`split-member-shares-${split.groupMemberId}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => setShares(index, shares + 1)}
                        aria-label={t("expenses.moreSharesFor", {
                          name: memberName,
                        })}
                        data-testid={`split-member-shares-increment-${split.groupMemberId}`}
                      >
                        <Plus />
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        {t("expenses.ofShares", { count: totalShares })}
                      </span>
                    </div>
                  )}

                  {splitMethod === "custom" && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {currency}
                      </span>
                      <CurrencyInput
                        value={split.amountInCents}
                        onChange={(cents) => setAmount(index, cents)}
                        placeholder="0.00"
                        min={0}
                        max={totalAmountCents}
                        className="flex-1"
                        data-testid={`split-member-amount-${split.groupMemberId}`}
                      />
                    </div>
                  )}

                  {index < splits.length - 1 && <Separator className="mt-2" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {splits.length > 0 && (
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {t("expenses.totalLabel")}
            </span>
            <span
              className={`font-semibold ${validation.isValid ? "" : "text-destructive"}`}
            >
              {formatCurrencyFromCents({
                cents: totalSplitCents,
                currency,
                locale,
              })}
              {isConverted &&
                ` · ${formatCurrencyFromCents({ cents: ledger.amountInCents, currency: ledger.currency, locale })}`}
            </span>
          </div>
          {!validation.isValid && validation.error && (
            <p className="text-destructive mt-1 text-xs">
              {t(validation.error.key, validation.error.values)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
