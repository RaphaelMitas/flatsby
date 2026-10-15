import { useState } from "react";

import type { CurrencyCode } from "./types";
import { rateBetween } from "./conversion";
import { formatExpenseDateShort, formatRate } from "./formatting";
import { isCurrencyCode } from "./types";

interface ExchangeRateQuery {
  data: { rate: number; date: string } | undefined;
  isError: boolean;
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The fetched rate follows the expense day; a typed or stored rate holds until the currencies change
export function useExpenseConversion({
  group,
  expense,
  currency,
  amountInCents,
  expenseDate,
  useExchangeRate,
}: {
  group: { currency: CurrencyCode; convertAutomatically: boolean | null };
  expense?: {
    amountInCents: number;
    currency: string;
    convertedAmountInCents: number | null;
    convertedCurrency: string | null;
    splitMethod: string;
  };
  currency: CurrencyCode;
  amountInCents: number;
  expenseDate: Date;
  useExchangeRate: (
    input: { from: CurrencyCode; to: CurrencyCode; day: string },
    enabled: boolean,
  ) => ExchangeRateQuery;
}) {
  const targetCurrency =
    expense?.convertedCurrency && isCurrencyCode(expense.convertedCurrency)
      ? expense.convertedCurrency
      : group.currency;
  // A stored choice wins; an expense saved in the group currency never had one, so it gets the group's default
  const [convert, setConvert] = useState(
    expense &&
      (expense.convertedAmountInCents !== null ||
        expense.currency !== group.currency)
      ? expense.convertedAmountInCents !== null
      : group.convertAutomatically === true,
  );
  const isShown =
    currency !== targetCurrency && expense?.splitMethod !== "settlement";
  const isOn = isShown && convert;

  const day = localDay(expenseDate);
  const fetched = useExchangeRate(
    { from: currency, to: targetCurrency, day },
    isShown,
  );

  const rateKey = `${currency}>${targetCurrency}`;
  const [ownRate, setOwnRate] = useState(
    expense?.convertedAmountInCents == null
      ? undefined
      : {
          rate: rateBetween(
            expense.amountInCents,
            expense.convertedAmountInCents,
          ),
          rateKey,
        },
  );
  const isOwnRate = ownRate?.rateKey === rateKey;
  const rate = isOwnRate ? ownRate.rate : fetched.data?.rate;

  const convertedAmountInCents =
    isOn && rate !== undefined && amountInCents > 0
      ? Math.round(amountInCents * rate)
      : null;
  const source =
    !isOwnRate && fetched.data
      ? ` · ECB, ${formatExpenseDateShort(new Date(`${fetched.data.date}T00:00`))}`
      : "";

  return {
    isShown,
    isOn,
    setOn: setConvert,
    targetCurrency,
    rateText:
      rate === undefined
        ? undefined
        : `${formatRate(currency, targetCurrency, rate)}${source}`,
    isOwnRate,
    reset: () => setOwnRate(undefined),
    canEnterConverted: amountInCents > 0,
    isMissingConverted: isOn && convertedAmountInCents === null,
    isRateUnavailable: rate === undefined && fetched.isError,
    setConvertedAmount: (cents: number) => {
      if (amountInCents > 0 && cents > 0) {
        setOwnRate({ rate: rateBetween(amountInCents, cents), rateKey });
      }
    },
    fields: {
      convertedAmountInCents,
      convertedCurrency:
        convertedAmountInCents === null ? null : targetCurrency,
    },
  };
}

export type ExpenseConversion = ReturnType<typeof useExpenseConversion>;
