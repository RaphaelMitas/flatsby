"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod/v4";
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

import type { expenseFormSchema } from "./ExpenseForm";
import {
  calculateEvenPercentageAmount,
  formatCurrency,
  percentageToAmount,
  validateSplits,
} from "./ExpenseUtils";

type Split = z.infer<typeof expenseFormSchema>["splits"][number];

interface SplitEditorProps {
  form: UseFormReturn<z.infer<typeof expenseFormSchema>>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmount: number;
  currency: string;
  splitMethod: "equal" | "percentage" | "custom";
  onSplitMethodChange: (method: "equal" | "percentage" | "custom") => void;
}

export function SplitEditor({
  form,
  groupMembers,
  totalAmount,
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
      const newSplits: Split[] = currentSplits.filter(
        (_: unknown, index: number) => index !== memberIndex,
      );
      // Recalculate equal percentages if in percentage mode
      if (splitMethod === "percentage" && newSplits.length > 0) {
        const updatedSplits: Split[] = calculateEvenPercentageAmount(
          groupMembers,
          totalAmount,
        );
        form.setValue("splits", updatedSplits, { shouldValidate: true });
      } else {
        form.setValue("splits", newSplits, { shouldValidate: true });
      }
    } else {
      // Add member
      const newSplitCount = currentSplits.length + 1;
      let newSplit: Split;

      if (splitMethod === "equal") {
        const equalAmount = totalAmount / newSplitCount;
        newSplit = {
          groupMemberId: memberId,
          percentage: null,
          amount: equalAmount,
        };
      } else if (splitMethod === "percentage") {
        const updatedSplits: Split[] = calculateEvenPercentageAmount(
          groupMembers,
          totalAmount,
        );
        newSplit = {
          groupMemberId: memberId,
          amount: 0,
          percentage: null,
        };
        form.setValue("splits", [...updatedSplits, newSplit], {
          shouldValidate: true,
        });
        return; // Early return since we already set the value
      } else {
        // Custom mode
        newSplit = {
          groupMemberId: memberId,
          amount: 0,
          percentage: null,
        };
      }

      form.setValue("splits", [...currentSplits, newSplit], {
        shouldValidate: true,
      });
    }
  };

  const updateSplitAmount = (index: number, value: string) => {
    const currentSplits: Split[] = form.getValues("splits");
    const numValue = parseFloat(value) || 0;
    const updatedSplits: Split[] = [...currentSplits];

    if (splitMethod === "custom") {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.amount = numValue;
    } else if (splitMethod === "percentage") {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.amount = percentageToAmount(totalAmount, numValue);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      updatedSplits[index]!.percentage = numValue;
    }

    form.setValue("splits", updatedSplits, { shouldValidate: true });
  };

  const validation = validateSplits(splits, totalAmount, splitMethod);
  const totalSplitAmount = splits.reduce((sum: number, split: Split) => {
    if (splitMethod === "custom") {
      return sum + split.amount;
    }
    if (splitMethod === "percentage") {
      return sum + ((split.percentage ?? 0) / 100) * totalAmount;
    }
    return sum;
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
                `Enter amounts (must sum to ${formatCurrency(totalAmount, currency)})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {splits.map((split: Split, index: number) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const splitAmount =
                splitMethod === "equal"
                  ? totalAmount / splits.length
                  : splitMethod === "percentage"
                    ? ((split.percentage ?? 0) / 100) * totalAmount
                    : split.amount;

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
                      {formatCurrency(splitAmount, currency)}
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
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  field.onChange(e);
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
                      name={`splits.${index}.amount`}
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
                                {...field}
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(e);
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
              {formatCurrency(totalSplitAmount, currency)}
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
