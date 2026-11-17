import type { GroupWithAccess } from "@flatsby/api";
import type { ConvertibleExpense } from "@flatsby/validators/expenses/conversion";
import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { EditableSplitMethod } from "@flatsby/validators/expenses/split-editing";
import type { UseFormReturn } from "react-hook-form";
import { Fragment } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { memberPerson } from "@flatsby/validators/expenses/formatting";
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

        <Card testID="split-details-card" className="overflow-hidden">
          {groupMembers.map((member, index) => {
            const row = rows.get(member.id);
            const name = member.user.name;
            const shares = row?.split.shares ?? 0;
            const hasInput = !!row && method !== "equal";

            return (
              <Fragment key={member.id}>
                {index > 0 && <Separator />}
                <View
                  className={cn(
                    "flex-row items-center",
                    hasInput && "gap-2 pr-3",
                  )}
                >
                  <Pressable
                    accessible={false}
                    onPress={() =>
                      Keyboard.isVisible()
                        ? Keyboard.dismiss()
                        : toggleMember(member.id)
                    }
                    className={cn(
                      "active:bg-muted flex-1 flex-row items-center self-stretch py-1",
                      !hasInput && "pr-3",
                    )}
                  >
                    <Checkbox
                      testID={`split-member-toggle-${index}`}
                      checked={!!row}
                      onCheckedChange={() => toggleMember(member.id)}
                      accessibilityLabel={t("expenses.includeInSplit", {
                        name,
                      })}
                    />
                    <View
                      className={cn(
                        "flex-1 flex-row items-center gap-3",
                        !row && "opacity-50",
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
                        {!!row?.detail && (
                          <Text className="text-muted-foreground text-sm">
                            {row.detail}
                          </Text>
                        )}
                      </View>
                    </View>

                    {row && method === "equal" && (
                      <View className="items-end">
                        <Text className="text-foreground text-base font-semibold">
                          {row.amount}
                        </Text>
                        {row.converted && (
                          <Text className="text-muted-foreground text-sm">
                            {row.converted}
                          </Text>
                        )}
                      </View>
                    )}
                  </Pressable>

                  {row && method === "custom" && (
                    <CurrencyInput
                      testID={`split-member-amount-${index}`}
                      value={row.split.amountInCents}
                      onChange={(cents) => setAmount(member.id, cents)}
                      placeholder={row.placeholder}
                      min={0}
                      max={totalAmountCents}
                      className="w-28 text-right"
                      accessibilityLabel={t("expenses.amountFor", { name })}
                    />
                  )}

                  {row && method === "percentage" && (
                    <View className="flex-row items-center gap-2">
                      <CurrencyInput
                        testID={`split-member-amount-${index}`}
                        value={row.split.percentage ?? 0}
                        onChange={(basisPoints) =>
                          setPercentage(member.id, basisPoints)
                        }
                        placeholder={row.placeholder}
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

                  {row && method === "shares" && (
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
            <Text className={cn("font-semibold", TONE_TEXT[status.tone])}>
              {t(status.primary.key, status.primary.values)}
            </Text>
            {status.secondary && (
              <Text className="text-muted-foreground">
                {` ${t(status.secondary.key, status.secondary.values)}`}
              </Text>
            )}
          </Text>
          {canSplitRest && (
            <Button
              testID="split-rest"
              title={t("expenses.splitRest")}
              variant="outline"
              size="sm"
              onPress={() => {
                Keyboard.dismiss();
                splitRest();
              }}
            />
          )}
        </View>
        {isTyped && (
          <View className="bg-muted h-1 overflow-hidden rounded-full">
            <View
              className={cn("h-1 rounded-full", TONE_BAR[status.tone])}
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
