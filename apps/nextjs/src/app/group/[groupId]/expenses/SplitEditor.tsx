"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type {
  ExpenseFormValues,
  ExpenseSplit,
} from "@flatsby/validators/expense";
import type { UseFormReturn } from "react-hook-form";
import { DollarSign, Equal, Percent } from "lucide-react";

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
import { Input } from "@flatsby/ui/input";
import { Separator } from "@flatsby/ui/separator";
import {
  calculateEvenSplitAmounts,
  centsToDecimal,
  decimalToCents,
  formatCurrencyFromCents,
  percentageToAmountCents,
  validateSplits,
} from "@flatsby/validators/expense";

interface SplitEditorProps {
  form: UseFormReturn<ExpenseFormValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  splitMethod: "equal" | "percentage" | "custom";
  onSplitMethodChange: (method: "equal" | "percentage" | "custom") => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmountCents,
  currency,
  splitMethod,
  onSplitMethodChange,
}: SplitEditorProps) {
  const splits = form.watch("splits");
  const selectedMemberIds = splits.map(
    (s: { groupMemberId: number }) => s.groupMemberId,
  );

  const toggleMember = (memberId: number) => {
    const currentSplits = form.getValues("splits");
    const memberIndex = currentSplits.findIndex(
      (s: { groupMemberId: number }) => s.groupMemberId === memberId,
    );

    if (memberIndex >= 0) {
      // Remove member
      const newSplits: ExpenseSplit[] = currentSplits.filter(
        (_: unknown, index: number) => index !== memberIndex,
      );
      // Recalculate equal percentages if in percentage mode
      if (splitMethod === "percentage" && newSplits.length > 0) {
        const remainingMemberIds = newSplits.map((s) => s.groupMemberId);
        const updatedSplits = calculateEvenSplitAmounts(
          remainingMemberIds,
          totalAmountCents,
        );
        form.setValue("splits", updatedSplits, { shouldValidate: true });
      } else {
        form.setValue("splits", newSplits, { shouldValidate: true });
      }
    } else {
      // Add member
      const newSplitCount = currentSplits.length + 1;
      let newSplit: ExpenseSplit;

      if (splitMethod === "equal") {
        const equalAmountCents = Math.round(totalAmountCents / newSplitCount);
        newSplit = {
          groupMemberId: memberId,
          percentage: null,
          amountInCents: equalAmountCents,
        };
      } else if (splitMethod === "percentage") {
        // Recalculate for all members including the new one
        const allMemberIds = [
          ...currentSplits.map((s) => s.groupMemberId),
          memberId,
        ];
        const updatedSplits = calculateEvenSplitAmounts(
          allMemberIds,
          totalAmountCents,
        );
        form.setValue("splits", updatedSplits, { shouldValidate: true });
        return; // Early return since we already set the value
      } else {
        // Custom mode
        newSplit = {
          groupMemberId: memberId,
          amountInCents: 0,
          percentage: null,
        };
      }

      form.setValue("splits", [...currentSplits, newSplit], {
        shouldValidate: true,
      });
    }
  };

  const updateSplitAmount = (index: number, value: string) => {
    const currentSplits: ExpenseSplit[] = form.getValues("splits");
    const updatedSplits: ExpenseSplit[] = [...currentSplits];

    if (splitMethod === "custom") {
      // User enters decimal value, convert to cents
      const decimalValue = parseFloat(value) || 0;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.amountInCents = decimalToCents(decimalValue);
    } else if (splitMethod === "percentage") {
      // User enters percentage as decimal (e.g., 25.5 for 25.5%)
      // Convert to basis points (25.5% = 2550 basis points)
      const percentValue = parseFloat(value) || 0;
      const basisPoints = Math.round(percentValue * 100);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.percentage = basisPoints;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.amountInCents = percentageToAmountCents(
        totalAmountCents,
        basisPoints,
      );
    }

    form.setValue("splits", updatedSplits, { shouldValidate: true });
  };

  const validation = validateSplits(splits, totalAmountCents, splitMethod);
  const totalSplitCents = splits.reduce((sum: number, split: ExpenseSplit) => {
    if (splitMethod === "custom") {
      return sum + split.amountInCents;
    }
    if (splitMethod === "percentage") {
      return (
        sum + percentageToAmountCents(totalAmountCents, split.percentage ?? 0)
      );
    }
    // Equal split
    return sum + Math.round(totalAmountCents / splits.length);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Split Method Selector */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={splitMethod === "equal" ? "primary" : "outline"}
          size="sm"
          onClick={() => onSplitMethodChange("equal")}
          className="flex-1"
        >
          <Equal className="mr-2 h-4 w-4" />
          Equal
        </Button>
        <Button
          type="button"
          variant={splitMethod === "percentage" ? "primary" : "outline"}
          size="sm"
          onClick={() => onSplitMethodChange("percentage")}
          className="flex-1"
        >
          <Percent className="mr-2 h-4 w-4" />
          Percentage
        </Button>
        <Button
          type="button"
          variant={splitMethod === "custom" ? "primary" : "outline"}
          size="sm"
          onClick={() => onSplitMethodChange("custom")}
          className="flex-1"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Custom
        </Button>
      </div>

      {/* Member Selection */}
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
                  variant={isSelected ? "primary" : "outline"}
                  onClick={() => toggleMember(member.id)}
                  className="flex h-auto flex-col items-center gap-2 py-3"
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

      {/* Split Details */}
      {splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Split Details</CardTitle>
            <CardDescription>
              {splitMethod === "equal" && "Amounts are split equally"}
              {splitMethod === "percentage" &&
                "Enter percentage for each person (must sum to 100%)"}
              {splitMethod === "custom" &&
                `Enter amounts (must sum to ${formatCurrencyFromCents(totalAmountCents, currency)})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {splits.map((split: ExpenseSplit, index: number) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const splitAmountCents =
                splitMethod === "equal"
                  ? Math.round(totalAmountCents / splits.length)
                  : splitMethod === "percentage"
                    ? percentageToAmountCents(
                        totalAmountCents,
                        split.percentage ?? 0,
                      )
                    : split.amountInCents;

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
                      {formatCurrencyFromCents(splitAmountCents, currency)}
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
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0"
                                value={
                                  field.value
                                    ? (field.value / 100).toFixed(2)
                                    : ""
                                }
                                onChange={(e) => {
                                  const percentValue =
                                    parseFloat(e.target.value) || 0;
                                  field.onChange(
                                    Math.round(percentValue * 100),
                                  );
                                  updateSplitAmount(index, e.target.value);
                                }}
                                className="flex-1"
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
                                {currency === "USD" ? "$" : currency}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={
                                  field.value
                                    ? centsToDecimal(field.value).toFixed(2)
                                    : ""
                                }
                                onChange={(e) => {
                                  const decimalValue =
                                    parseFloat(e.target.value) || 0;
                                  field.onChange(decimalToCents(decimalValue));
                                  updateSplitAmount(index, e.target.value);
                                }}
                                className="flex-1"
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

      {/* Validation Summary */}
      {splits.length > 0 && (
        <div className="text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total:</span>
            <span
              className={`font-semibold ${validation.isValid ? "" : "text-destructive"}`}
            >
              {formatCurrencyFromCents(totalSplitCents, currency)}
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
