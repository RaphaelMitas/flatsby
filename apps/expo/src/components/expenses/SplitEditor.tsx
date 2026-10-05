import type { GroupWithAccess } from "@flatsby/api";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { UseFormReturn } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { useWatch } from "react-hook-form";

import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import {
  splitsForMethod,
  splitsWithMemberToggled,
  splitsWithPercentage,
  splitsWithShares,
} from "@flatsby/validators/expenses/split-editing";
import { validateSplits } from "@flatsby/validators/expenses/validation";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/lib/ui/card";
import { Input } from "~/lib/ui/input";
import { Separator } from "~/lib/ui/separator";
import { CurrencyInput } from "./CurrencyInput";

const SPLIT_METHOD_OPTIONS = [
  { method: "equal", label: "Equal", icon: "equal" },
  { method: "percentage", label: "Percentage", icon: "percent" },
  { method: "shares", label: "Shares", icon: "divide" },
  { method: "custom", label: "Custom", icon: "dollar-sign" },
] as const satisfies readonly {
  method: EditableSplitMethod;
  label: string;
  icon: IconProps["name"];
}[];

interface SplitEditorProps {
  form: UseFormReturn<ExpenseValues>;
  groupMembers: GroupWithAccess["groupMembers"];
  totalAmountCents: number;
  currency: string;
  splitMethod: EditableSplitMethod;
  onSplitMethodChange: (method: EditableSplitMethod) => void;
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
  const selectedMemberIds = splits.map((s) => s.groupMemberId);
  const setSplits = (next: ExpenseValues["splits"]) =>
    form.setValue("splits", next, { shouldValidate: true });

  const handleSplitMethodChange = (newMethod: EditableSplitMethod) => {
    setSplits(
      splitsForMethod(newMethod, form.getValues("splits"), totalAmountCents),
    );
    onSplitMethodChange(newMethod);
  };

  const toggleMember = (memberId: number) =>
    setSplits(
      splitsWithMemberToggled(
        splitMethod,
        form.getValues("splits"),
        memberId,
        totalAmountCents,
      ),
    );

  const setPercentage = (index: number, basisPoints: number) =>
    setSplits(
      splitsWithPercentage(
        form.getValues("splits"),
        index,
        basisPoints,
        totalAmountCents,
      ),
    );

  const setShares = (index: number, shares: number) =>
    setSplits(
      splitsWithShares(
        form.getValues("splits"),
        index,
        shares,
        totalAmountCents,
      ),
    );

  const setAmount = (index: number, amountInCents: number) =>
    setSplits(
      form
        .getValues("splits")
        .map((s, i) => (i === index ? { ...s, amountInCents } : s)),
    );

  const validation = validateSplits({
    splits,
    totalAmountCents,
    method: splitMethod,
  });

  const totalSplitCents = splits.reduce((sum, s) => sum + s.amountInCents, 0);
  const totalShares = splits.reduce((sum, s) => sum + (s.shares ?? 0), 0);

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        {SPLIT_METHOD_OPTIONS.map(({ method, label, icon }) => (
          <Button
            key={method}
            testID={`split-method-${method}`}
            title={label}
            variant={splitMethod === method ? "primary" : "outline"}
            size="sm"
            onPress={() => handleSplitMethodChange(method)}
            icon={icon}
            className="flex-1"
            numberOfLines={1}
          />
        ))}
      </View>

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

      {splits.length > 0 && (
        <Card testID="split-details-card">
          <CardHeader>
            <CardTitle>Split Details</CardTitle>
            <CardDescription>
              {splitMethod === "equal" && "Amounts are split equally"}
              {splitMethod === "percentage" &&
                "Enter percentage for each person (must sum to 100%)"}
              {splitMethod === "shares" &&
                `Enter shares for each person (${totalShares} total)`}
              {splitMethod === "custom" &&
                `Enter amounts (must sum to ${formatCurrencyFromCents({ cents: totalAmountCents, currency })})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {splits.map((split, index) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? "Unknown";
              const shares = split.shares ?? 0;

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
                        cents: split.amountInCents,
                        currency,
                      })}
                    </Text>
                  </View>

                  {splitMethod === "percentage" && (
                    <View className="flex-row items-center gap-2">
                      <CurrencyInput
                        testID={`split-member-amount-${index}`}
                        value={split.percentage ?? 0}
                        onChange={(basisPoints) =>
                          setPercentage(index, basisPoints)
                        }
                        placeholder="0.00"
                        min={0}
                        max={10000}
                        className="flex-1"
                      />
                      <Text className="text-muted-foreground text-sm">%</Text>
                    </View>
                  )}

                  {splitMethod === "shares" && (
                    <View className="flex-row items-center gap-2">
                      <Button
                        testID={`split-member-shares-decrement-${index}`}
                        variant="outline"
                        size="icon"
                        icon="minus"
                        onPress={() => setShares(index, shares - 1)}
                        disabled={shares <= 1}
                        accessibilityLabel="Fewer shares"
                      />
                      <Input
                        testID={`split-member-shares-${index}`}
                        keyboardType="number-pad"
                        value={shares === 0 ? "" : String(shares)}
                        onChangeText={(text) =>
                          setShares(index, Number.parseInt(text) || 0)
                        }
                        className="w-16 text-center"
                      />
                      <Button
                        testID={`split-member-shares-increment-${index}`}
                        variant="outline"
                        size="icon"
                        icon="plus"
                        onPress={() => setShares(index, shares + 1)}
                        accessibilityLabel="More shares"
                      />
                      <Text className="text-muted-foreground text-sm">
                        of {totalShares}{" "}
                        {totalShares === 1 ? "share" : "shares"}
                      </Text>
                    </View>
                  )}

                  {splitMethod === "custom" && (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-muted-foreground text-sm">
                        {currency}
                      </Text>
                      <CurrencyInput
                        testID={`split-member-amount-${index}`}
                        value={split.amountInCents}
                        onChange={(cents) => setAmount(index, cents)}
                        placeholder="0.00"
                        min={0}
                        max={totalAmountCents}
                        className="flex-1"
                      />
                    </View>
                  )}

                  {index < splits.length - 1 && <Separator className="mt-2" />}
                </View>
              );
            })}
          </CardContent>
        </Card>
      )}

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
