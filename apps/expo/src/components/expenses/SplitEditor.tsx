import type { GroupWithAccess } from "@flatsby/api";
import type { ConvertibleExpense } from "@flatsby/validators/expenses/conversion";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { UseFormReturn } from "react-hook-form";
import { Fragment } from "react";
import { Text, View } from "react-native";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

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

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { AppKeyboardStickyView } from "~/lib/components/keyboard-sticky-view";
import { Button } from "~/lib/ui/button";
import { Card } from "~/lib/ui/card";
import { Checkbox } from "~/lib/ui/checkbox";
import { Input } from "~/lib/ui/input";
import { Segmented } from "~/lib/ui/segmented";
import { Separator } from "~/lib/ui/separator";
import { cn } from "~/lib/utils";
import { CurrencyInput } from "./CurrencyInput";
import { MemberAvatar } from "./MemberAvatar";

const SPLIT_METHODS = [
  { value: "equal", testID: "split-method-equal" },
  { value: "percentage", testID: "split-method-percentage" },
  { value: "shares", testID: "split-method-shares" },
  { value: "custom", testID: "split-method-custom" },
] as const satisfies readonly { value: EditableSplitMethod; testID: string }[];

const FOOTER_HEIGHT = 144;

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
    <>
      <AppScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4"
        bottomOffset={FOOTER_HEIGHT}
      >
        <Segmented
          options={SPLIT_METHODS.map((option) => ({
            ...option,
            label: t(`expenses.splitMethods.${option.value}`),
          }))}
          value={method}
          onChange={changeMethod}
        />

        <Card testID="split-details-card">
          {groupMembers.map((member, index) => {
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
              <Fragment key={member.id}>
                {index > 0 && <Separator />}
                <View className="flex-row items-center py-1 pr-3">
                  <Checkbox
                    testID={`split-member-toggle-${index}`}
                    checked={!!split}
                    onCheckedChange={() => toggleMember(member.id)}
                    accessibilityLabel={t("expenses.includeInSplit", { name })}
                  />
                  <View
                    className={cn(
                      "flex-1 flex-row items-center gap-3",
                      !split && "opacity-50",
                    )}
                  >
                    <MemberAvatar
                      person={memberPerson(member)}
                      className="h-8 w-8"
                    />
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-foreground text-base font-medium"
                      >
                        {name}
                      </Text>
                      {split && !!detail && (
                        <Text className="text-muted-foreground text-sm">
                          {detail}
                        </Text>
                      )}
                    </View>
                  </View>

                  {split && method === "equal" && (
                    <View className="items-end">
                      <Text className="text-foreground text-base font-semibold">
                        {amount}
                      </Text>
                      {converted && (
                        <Text className="text-muted-foreground text-sm">
                          {converted}
                        </Text>
                      )}
                    </View>
                  )}

                  {split && method === "custom" && (
                    <CurrencyInput
                      testID={`split-member-amount-${index}`}
                      value={split.amountInCents}
                      onChange={(cents) => setAmount(member.id, cents)}
                      placeholder={rest.toFixed(2)}
                      min={0}
                      max={totalAmountCents}
                      className="w-28 text-right"
                      accessibilityLabel={t("expenses.amountFor", { name })}
                    />
                  )}

                  {split && method === "percentage" && (
                    <View className="flex-row items-center gap-2">
                      <CurrencyInput
                        testID={`split-member-amount-${index}`}
                        value={split.percentage ?? 0}
                        onChange={(basisPoints) =>
                          setPercentage(member.id, basisPoints)
                        }
                        placeholder={rest.toFixed(2)}
                        min={0}
                        max={10000}
                        className="w-24 text-right"
                        accessibilityLabel={t("expenses.percentageFor", {
                          name,
                        })}
                      />
                      <Text className="text-muted-foreground text-sm">%</Text>
                    </View>
                  )}

                  {split && method === "shares" && (
                    <View className="flex-row items-center gap-1">
                      <Button
                        testID={`split-member-shares-decrement-${index}`}
                        variant="outline"
                        size="icon"
                        icon="minus"
                        onPress={() => setShares(member.id, shares - 1)}
                        disabled={shares <= 1}
                        accessibilityLabel={t("expenses.fewerSharesFor", {
                          name,
                        })}
                      />
                      <Input
                        testID={`split-member-shares-${index}`}
                        keyboardType="number-pad"
                        value={shares === 0 ? "" : String(shares)}
                        onChangeText={(text) =>
                          setShares(member.id, Number.parseInt(text, 10) || 0)
                        }
                        textAlign="center"
                        className="w-12 px-1"
                        accessibilityLabel={t("expenses.sharesFor", { name })}
                      />
                      <Button
                        testID={`split-member-shares-increment-${index}`}
                        variant="outline"
                        size="icon"
                        icon="plus"
                        onPress={() => setShares(member.id, shares + 1)}
                        accessibilityLabel={t("expenses.moreSharesFor", {
                          name,
                        })}
                      />
                    </View>
                  )}
                </View>
              </Fragment>
            );
          })}
        </Card>
      </AppScrollView>

      <AppKeyboardStickyView className="border-border bg-background gap-3 border-t p-4">
        <View className="min-h-9 flex-row items-center justify-between gap-2">
          <Text testID="split-status" className="text-foreground shrink">
            {problem ? (
              <>
                <Text
                  className={cn(
                    "font-semibold",
                    remaining <= 0 && "text-destructive",
                  )}
                >
                  {t(problem.key, problem.values)}
                </Text>
                {isTyped && splits.length > 0 && (
                  <Text className="text-muted-foreground">
                    {` ${t("expenses.splitOfTotal", { total })}`}
                  </Text>
                )}
              </>
            ) : isTyped ? (
              <Text className="text-success font-semibold">
                {t("expenses.splitAddsUp", { total })}
              </Text>
            ) : (
              <>
                <Text className="font-semibold">
                  {method === "shares"
                    ? t("expenses.sharesCount", { count: totalShares })
                    : t("expenses.splitEach", {
                        amount: money(splits[0]?.amountInCents ?? 0),
                      })}
                </Text>
                <Text className="text-muted-foreground">{` · ${people}`}</Text>
              </>
            )}
          </Text>
          {remaining > 0 && !validation.isValid && (
            <Button
              testID="split-rest"
              title={t("expenses.splitRest")}
              variant="outline"
              size="sm"
              onPress={splitRest}
            />
          )}
        </View>
        {isTyped && (
          <View className="bg-muted h-1 overflow-hidden rounded-full">
            <View
              className={cn(
                "h-1 rounded-full",
                remaining < 0
                  ? "bg-destructive"
                  : validation.isValid
                    ? "bg-success"
                    : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </View>
        )}
        <Button
          testID="split-done"
          title={t("common.done")}
          onPress={onDone}
          disabled={!validation.isValid}
        />
      </AppKeyboardStickyView>
    </>
  );
}
