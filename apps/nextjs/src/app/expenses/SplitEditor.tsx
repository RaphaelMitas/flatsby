"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type {
  ExpenseSplit,
  SplitMethod,
} from "@flatsby/validators/expenses/types";
import type { UseFormReturn } from "react-hook-form";
import { DollarSign, Equal, Percent } from "lucide-react";
import { useWatch } from "react-hook-form";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@flatsby/ui/form";
import { Separator } from "@flatsby/ui/separator";
import { decimalToCents } from "@flatsby/validators/expenses/conversion";
import {
  distributeEqualAmounts,
  distributePercentageAmounts,
  emptySplit,
} from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { validateSplits } from "@flatsby/validators/expenses/validation";

import { CurrencyInput } from "~/components/CurrencyInput";

interface SplitEditorProps {
  form: UseFormReturn<ExpenseValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  splitMethod: Exclude<SplitMethod, "settlement">;
  onSplitMethodChange: (method: Exclude<SplitMethod, "settlement">) => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmountCents,
  currency,
  splitMethod,
  onSplitMethodChange,
}: SplitEditorProps) {
  const splits = useWatch({ control: form.control, name: "splits" });
  const selectedMemberIds = splits.map(
    (s: { groupMemberId: number }) => s.groupMemberId,
  );

  const handleSplitMethodChange = (
    newMethod: Exclude<SplitMethod, "settlement">,
  ) => {
    const memberIds = form.getValues("splits").map((s) => s.groupMemberId);

    if (newMethod === "equal") {
      form.setValue(
        "splits",
        distributeEqualAmounts(memberIds, totalAmountCents),
        { shouldValidate: true },
      );
    } else if (newMethod !== splitMethod) {
      form.setValue(
        "splits",
        memberIds.map((groupMemberId) => emptySplit(groupMemberId)),
        { shouldValidate: true },
      );
    }

    onSplitMethodChange(newMethod);
  };

  const toggleMember = (memberId: number) => {
    const currentSplits = form.getValues("splits");
    const isSelected = currentSplits.some((s) => s.groupMemberId === memberId);

    if (splitMethod === "equal") {
      const memberIds = currentSplits.map((s) => s.groupMemberId);
      const updatedMemberIds = isSelected
        ? memberIds.filter((id) => id !== memberId)
        : [...memberIds, memberId];
      form.setValue(
        "splits",
        distributeEqualAmounts(updatedMemberIds, totalAmountCents),
        { shouldValidate: true },
      );
    } else {
      const updatedSplits = isSelected
        ? currentSplits.filter((s) => s.groupMemberId !== memberId)
        : [...currentSplits, emptySplit(memberId)];
      form.setValue("splits", updatedSplits, { shouldValidate: true });
    }
  };

  const updateSplitAmount = (index: number, value: number) => {
    const currentSplits: ExpenseSplit[] = form.getValues("splits");
    const splitAtIndex = currentSplits[index];
    if (!splitAtIndex) return;

    if (splitMethod === "custom") {
      // Value is already in cents when coming from CurrencyInput
      const cents =
        typeof value === "number"
          ? value
          : decimalToCents(parseFloat(value) || 0);
      const updatedSplits = currentSplits.map((s, i) =>
        i === index ? { ...s, amountInCents: cents } : s,
      );
      form.setValue("splits", updatedSplits, { shouldValidate: true });
    } else if (splitMethod === "percentage") {
      const updatedSplits = currentSplits.map((s, i) =>
        i === index ? { ...s, percentage: value } : s,
      );
      const distributedSplits = distributePercentageAmounts(
        updatedSplits,
        totalAmountCents,
      );
      form.setValue("splits", distributedSplits, { shouldValidate: true });
    }
  };

  const validation = validateSplits({
    splits,
    totalAmountCents,
    method: splitMethod,
  });

  const totalSplitCents = splits.reduce((sum: number, split: ExpenseSplit) => {
    return sum + split.amountInCents;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={splitMethod === "equal" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSplitMethodChange("equal")}
          className="flex-1"
          data-testid="split-method-equal"
        >
          <Equal className="mr-2 h-4 w-4" />
          Equal
        </Button>
        <Button
          type="button"
          variant={splitMethod === "percentage" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSplitMethodChange("percentage")}
          className="flex-1"
          data-testid="split-method-percentage"
        >
          <Percent className="mr-2 h-4 w-4" />
          Percentage
        </Button>
        <Button
          type="button"
          variant={splitMethod === "custom" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSplitMethodChange("custom")}
          className="flex-1"
          data-testid="split-method-custom"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Custom
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select People</CardTitle>
          <CardDescription>
            Choose who should be included in this expense
          </CardDescription>
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      alt={member.user.name}
                      src={member.user.image ?? ""}
                    />
                    <AvatarFallback className="text-muted-foreground bg-muted text-xs">
                      {member.user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
            <CardTitle className="text-base">Split Details</CardTitle>
            <CardDescription>
              {splitMethod === "equal" && "Amounts are split equally"}
              {splitMethod === "percentage" &&
                "Enter percentage for each person (must sum to 100%)"}
              {splitMethod === "custom" &&
                `Enter amounts (must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency })})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {splits.map((split: ExpenseSplit, index: number) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const splitAmountCents = split.amountInCents;

              return (
                <div key={split.groupMemberId} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        alt={memberName}
                        src={member?.user.image ?? undefined}
                      />
                      <AvatarFallback className="text-xs">
                        {memberName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">
                      {memberName}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatCurrencyFromCents({
                        cents: splitAmountCents,
                        currency,
                      })}
                    </span>
                  </div>

                  {splitMethod === "percentage" && (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.percentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <CurrencyInput
                                value={field.value ?? 0}
                                onChange={(cents) => {
                                  field.onChange(cents);
                                  updateSplitAmount(index, cents);
                                }}
                                placeholder="0.00"
                                min={0}
                                max={10000}
                                className="flex-1"
                                data-testid={`split-member-amount-${split.groupMemberId}`}
                              />
                              <span className="text-muted-foreground text-sm">
                                %
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {splitMethod === "custom" && (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.amountInCents`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm">
                                {currency}
                              </span>
                              <CurrencyInput
                                value={field.value}
                                onChange={(cents) => {
                                  field.onChange(cents);
                                  updateSplitAmount(index, cents);
                                }}
                                placeholder="0.00"
                                min={0}
                                max={totalAmountCents}
                                className="flex-1"
                                data-testid={`split-member-amount-${split.groupMemberId}`}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
            <span className="text-muted-foreground">Total:</span>
            <span
              className={`font-semibold ${validation.isValid ? "" : "text-destructive"}`}
            >
              {formatCurrencyFromCents({ cents: totalSplitCents, currency })}
            </span>
          </div>
          {!validation.isValid && validation.error && (
            <p className="text-destructive mt-1 text-xs">{validation.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
