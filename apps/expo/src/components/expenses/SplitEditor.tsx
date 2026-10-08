import type { GroupWithAccess } from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type {
  ExpenseSplit,
  SplitMethod,
} from "@flatsby/validators/expenses/types";
import type { UseFormReturn } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { useWatch } from "react-hook-form";

import {
  distributeEqualAmounts,
  distributePercentageAmounts,
  emptySplit,
} from "@flatsby/validators/expenses/distribution";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { validateSplits } from "@flatsby/validators/expenses/validation";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import { FormControl, FormField, FormMessage } from "~/lib/ui/form";
import { Separator } from "~/lib/ui/separator";
import { CurrencyInput } from "./CurrencyInput";

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
      const updatedSplits = currentSplits.map((s, i) =>
        i === index ? { ...s, amountInCents: value } : s,
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
    <View className="gap-4">
      {/* Split Method Selection */}
      <View className="flex-row gap-2">
        <Button
          testID="split-method-equal"
          title="Equal"
          variant={splitMethod === "equal" ? "primary" : "outline"}
          size="sm"
          onPress={() => handleSplitMethodChange("equal")}
          icon="equal"
          className="flex-1"
        />
        <Button
          testID="split-method-percentage"
          title="Percentage"
          variant={splitMethod === "percentage" ? "primary" : "outline"}
          size="sm"
          onPress={() => handleSplitMethodChange("percentage")}
          icon="percent"
          className="flex-1"
        />
        <Button
          testID="split-method-custom"
          title="Custom"
          variant={splitMethod === "custom" ? "primary" : "outline"}
          size="sm"
          onPress={() => handleSplitMethodChange("custom")}
          icon="dollar-sign"
          className="flex-1"
        />
      </View>

      {/* Select People */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Select People</CardTitle>
          <CardDescription>
            Choose who should be included in this expense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex-row flex-wrap gap-2">
            {groupMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => toggleMember(member.id)}
                  className={`flex h-auto flex-col items-center gap-2 rounded-lg border p-3 ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-input bg-background"
                  }`}
                  activeOpacity={0.7}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback>
                      {member.user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Text
                    className={`w-full truncate text-center text-xs ${
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    }`}
                    numberOfLines={1}
                  >
                    {member.user.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </CardContent>
      </Card>

      {/* Split Details */}
      {splits.length > 0 && (
        <Card testID="split-details-card">
          <CardHeader>
            <CardTitle>Split Details</CardTitle>
            <CardDescription>
              {splitMethod === "equal" && "Amounts are split equally"}
              {splitMethod === "percentage" &&
                "Enter percentage for each person (must sum to 100%)"}
              {splitMethod === "custom" &&
                `Enter amounts (must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency })})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {splits.map((split: ExpenseSplit, index: number) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const splitAmountCents = split.amountInCents;

              return (
                <View key={split.groupMemberId} className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member?.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {memberName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-foreground flex-1 text-sm font-medium">
                      {memberName}
                    </Text>
                    <Text className="text-foreground text-sm font-semibold">
                      {formatCurrencyFromCents({
                        cents: splitAmountCents,
                        currency,
                      })}
                    </Text>
                  </View>

                  {splitMethod === "percentage" && (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.percentage`}
                      render={({ field }) => (
                        <View className="gap-2">
                          <FormControl>
                            <View className="flex-row items-center gap-2">
                              <CurrencyInput
                                testID={`split-member-amount-${index}`}
                                value={field.value ?? 0}
                                onChange={(cents) => {
                                  field.onChange(cents);
                                  updateSplitAmount(index, cents);
                                }}
                                placeholder="0.00"
                                min={0}
                                max={10000}
                                className="flex-1"
                              />
                              <Text className="text-muted-foreground text-sm">
                                %
                              </Text>
                            </View>
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />
                  )}

                  {splitMethod === "custom" && (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.amountInCents`}
                      render={({ field }) => (
                        <View className="gap-2">
                          <FormControl>
                            <View className="flex-row items-center gap-2">
                              <Text className="text-muted-foreground text-sm">
                                {currency}
                              </Text>
                              <CurrencyInput
                                testID={`split-member-amount-${index}`}
                                value={field.value}
                                onChange={(cents) => {
                                  field.onChange(cents);
                                  updateSplitAmount(index, cents);
                                }}
                                placeholder="0.00"
                                min={0}
                                max={totalAmountCents}
                                className="flex-1"
                              />
                            </View>
                          </FormControl>
                          <FormMessage />
                        </View>
                      )}
                    />
                  )}

                  {index < splits.length - 1 && <Separator className="mt-2" />}
                </View>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Total */}
      {splits.length > 0 && (
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-sm">Total:</Text>
            <Text
              className={`text-foreground text-sm font-semibold ${
                validation.isValid ? "" : "text-destructive"
              }`}
            >
              {formatCurrencyFromCents({ cents: totalSplitCents, currency })}
            </Text>
          </View>
          {!validation.isValid && validation.error && (
            <Text className="text-destructive mt-1 text-xs">
              {validation.error}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
