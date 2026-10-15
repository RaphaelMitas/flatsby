import type { ExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";
import { Pressable, Text, View } from "react-native";

import { Label } from "~/lib/ui/label";
import { Switch } from "~/lib/ui/switch";
import { CurrencyInput } from "./CurrencyInput";
import { RateInfoButton } from "./RateInfoButton";

export function ConversionField({
  currency,
  conversion,
}: {
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
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-muted-foreground text-sm">
              In {targetCurrency}
            </Text>
            <CurrencyInput
              testID="expense-form-converted-amount"
              value={conversion.fields.convertedAmountInCents ?? 0}
              disabled={!conversion.canEnterConverted}
              onChange={conversion.setConvertedAmount}
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
                  <Text className="text-info text-xs font-medium">Reset</Text>
                </Pressable>
              )}
            </View>
          )}
          {conversion.isRateUnavailable && (
            <Text className="text-muted-foreground text-xs">
              Couldn't load a rate, enter the {targetCurrency} amount
            </Text>
          )}
        </View>
      ) : (
        <Text className="text-muted-foreground text-xs">
          Stays in {currency}. Settled separately from {targetCurrency} debts.
        </Text>
      )}
    </View>
  );
}
