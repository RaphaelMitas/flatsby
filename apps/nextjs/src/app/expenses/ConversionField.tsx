"use client";

import type { ExpenseConversion } from "@flatsby/validators/expenses/useExpenseConversion";

import { Button } from "@flatsby/ui/button";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";

import { CurrencyInput } from "~/components/CurrencyInput";
import { RateSourceInfo } from "./RateSourceInfo";

export function ConversionField({
  currency,
  conversion,
}: {
  currency: string;
  conversion: ExpenseConversion;
}) {
  if (!conversion.isShown) return null;
  const { targetCurrency } = conversion;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="expense-convert">Convert to {targetCurrency}</Label>
        <Switch
          id="expense-convert"
          checked={conversion.isOn}
          onCheckedChange={conversion.setOn}
          data-testid="expense-form-convert"
        />
      </div>
      {conversion.isOn ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 text-sm">
              In {targetCurrency}
            </span>
            <CurrencyInput
              value={conversion.fields.convertedAmountInCents ?? 0}
              onChange={conversion.setConvertedAmount}
              disabled={!conversion.canEnterConverted}
              className="flex-1"
              data-testid="expense-form-converted-amount"
            />
          </div>
          {conversion.rateText ? (
            <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1">
                {conversion.rateText}
                <RateSourceInfo currency={targetCurrency} />
              </span>
              {conversion.isOwnRate && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={conversion.reset}
                >
                  Reset
                </Button>
              )}
            </div>
          ) : (
            conversion.isRateUnavailable && (
              <p className="text-muted-foreground text-xs">
                Couldn&apos;t load a rate, enter the {targetCurrency} amount
              </p>
            )
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          Stays in {currency}. Settled separately from {targetCurrency} debts.
        </p>
      )}
    </div>
  );
}
