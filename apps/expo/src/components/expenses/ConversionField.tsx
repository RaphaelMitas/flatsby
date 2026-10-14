import type { ExpenseValues } from "@flatsby/validators/expenses/schemas";
import type { ExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";
import type { UseFormReturn } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { FormField, FormMessage } from "~/lib/ui/form";
import { Label } from "~/lib/ui/label";
import { Switch } from "~/lib/ui/switch";
import { CurrencyInput } from "./CurrencyInput";
import { RateInfoButton } from "./RateInfoButton";

export function ConversionField({
  form,
  currency,
  conversion,
}: {
  form: UseFormReturn<ExpenseValues>;
  currency: string;
  conversion: ExpenseConversion;
}) {
  const { targetCurrency, isOn } = conversion;
  if (!conversion.isShown) return null;

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Label>Convert to {targetCurrency}</Label>
        <Switch
          testID="expense-form-convert"
          checked={isOn}
          onCheckedChange={conversion.setOn}
        />
      </View>
      {isOn ? (
        <FormField
          control={form.control}
          name="convertedAmountInCents"
          render={() => (
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-muted-foreground text-sm">
                  In {targetCurrency}
                </Text>
                <CurrencyInput
                  testID="expense-form-converted-amount"
                  value={conversion.fields.convertedAmountInCents ?? 0}
                  disabled={!conversion.canEnterConverted}
                  onChange={(cents) => {
                    form.clearErrors("convertedAmountInCents");
                    conversion.setConvertedAmount(cents);
                  }}
                  placeholder="0.00"
                  className="flex-1"
                />
              </View>
              {conversion.rateText !== undefined && (
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-muted-foreground text-xs">
                    {conversion.rateText}
                  </Text>
                  <RateInfoButton targetCurrency={targetCurrency} />
                  {conversion.isOwnRate && (
                    <Pressable
                      testID="expense-form-rate-reset"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={conversion.reset}
                    >
                      <Text className="text-info text-xs font-medium">
                        Reset
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              {conversion.isRateUnavailable && (
                <Text className="text-muted-foreground text-xs">
                  Couldn't load a rate, enter the {targetCurrency} amount
                </Text>
              )}
              <FormMessage />
            </View>
          )}
        />
      ) : (
        <Text className="text-muted-foreground text-xs">
          Stays in {currency}. Settled separately from {targetCurrency} debts.
        </Text>
      )}
    </View>
  );
}
