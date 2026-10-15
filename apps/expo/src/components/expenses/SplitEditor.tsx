import type { GroupWithAccess } from "@flatsby/api";
import type { ConvertibleExpense } from "@flatsby/validators/expenses/conversion";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { UseFormReturn } from "react-hook-form";
import { Text, TouchableOpacity, View } from "react-native";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { inLedgerCurrency } from "@flatsby/validators/expenses/conversion";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import { splitEditor } from "@flatsby/validators/expenses/split-editing";

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
  { method: "equal", icon: "equal" },
  { method: "percentage", icon: "percent" },
  { method: "shares", icon: "divide" },
  { method: "custom", icon: "dollar-sign" },
] as const satisfies readonly {
  method: EditableSplitMethod;
  icon: IconProps["name"];
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
  const ledger = inLedgerCurrency({
    amountInCents: totalAmountCents,
    currency,
    ...conversion,
    expenseSplits: splits,
  });
  const isConverted = ledger.currency !== currency;

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-2">
        {SPLIT_METHOD_OPTIONS.map(({ method, icon }) => (
          <Button
            key={method}
            testID={`split-method-${method}`}
            title={t(`expenses.splitMethods.${method}`)}
            variant={splitMethod === method ? "primary" : "outline"}
            size="sm"
            onPress={() => changeMethod(method)}
            icon={icon}
            className="grow basis-[40%]"
            numberOfLines={1}
          />
        ))}
      </View>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            {t("expenses.selectPeople")}
          </CardTitle>
          <CardDescription>{t("expenses.selectPeopleHint")}</CardDescription>
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
            <CardTitle>{t("expenses.splitDetails")}</CardTitle>
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
          <CardContent className="gap-3">
            {splits.map((split, index) => {
              const member = groupMembers.find(
                (m) => m.id === split.groupMemberId,
              );
              const memberName = member?.user.name ?? t("common.unknown");
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
                        locale,
                      })}
                    </Text>
                    {isConverted && (
                      <Text className="text-muted-foreground text-sm">
                        {formatCurrencyFromCents({
                          cents:
                            ledger.expenseSplits[index]?.amountInCents ?? 0,
                          currency: ledger.currency,
                          locale,
                        })}
                      </Text>
                    )}
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
                        accessibilityLabel={t("expenses.fewerSharesFor", {
                          name: memberName,
                        })}
                      />
                      <Input
                        testID={`split-member-shares-${index}`}
                        keyboardType="number-pad"
                        value={shares === 0 ? "" : String(shares)}
                        onChangeText={(text) =>
                          setShares(index, Number.parseInt(text, 10) || 0)
                        }
                        textAlign="center"
                        className="w-16 px-2"
                        accessibilityLabel={t("expenses.sharesFor", {
                          name: memberName,
                        })}
                      />
                      <Button
                        testID={`split-member-shares-increment-${index}`}
                        variant="outline"
                        size="icon"
                        icon="plus"
                        onPress={() => setShares(index, shares + 1)}
                        accessibilityLabel={t("expenses.moreSharesFor", {
                          name: memberName,
                        })}
                      />
                      <Text className="text-muted-foreground text-sm">
                        {t("expenses.ofShares", { count: totalShares })}
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
            <Text className="text-muted-foreground text-sm">
              {t("expenses.totalLabel")}
            </Text>
            <Text
              className={`text-foreground text-sm font-semibold ${
                validation.isValid ? "" : "text-destructive"
              }`}
            >
              {formatCurrencyFromCents({
                cents: totalSplitCents,
                currency,
                locale,
              })}
              {isConverted &&
                ` · ${formatCurrencyFromCents({ cents: ledger.amountInCents, currency: ledger.currency, locale })}`}
            </Text>
          </View>
          {!validation.isValid && validation.error && (
            <Text className="text-destructive mt-1 text-xs">
              {t(validation.error.key, validation.error.values)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
