import { useMemo, useState } from "react";

import {
  centsToDecimal,
  decimalToCents,
} from "@flatsby/validators/expenses/conversion";

import { Input } from "~/lib/ui/input";

interface CurrencyInputProps {
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  className,
  min,
  max,
  disabled,
  autoFocus,
  accessibilityLabel,
  testID,
}: CurrencyInputProps) {
  const [rawInput, setRawInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const extractDigits = (input: string): string => {
    const normalized = input.replace(/,/g, ".");
    const cleaned = normalized.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return `${parts[0]}.${parts.slice(1).join("")}`;
    }
    return cleaned;
  };

  const limitDecimals = (input: string): string => {
    if (!input.includes(".")) return input;
    const parts = input.split(".");
    const integerPart = parts[0] ?? "";
    const decimalPart = parts[1] ?? "";
    const limitedDecimal = decimalPart.slice(0, 2);
    return decimalPart.length > 0
      ? `${integerPart}.${limitedDecimal}`
      : integerPart + (input.endsWith(".") ? "." : "");
  };

  const computedDisplayValue = useMemo(() => {
    if (value === 0) return "";
    return centsToDecimal(value).toFixed(2);
  }, [value]);

  const parseInputToCents = (input: string): number => {
    const cleaned = extractDigits(input);
    if (!cleaned || cleaned === "") {
      return 0;
    }

    const limited = limitDecimals(cleaned);
    const decimalValue = parseFloat(limited) || 0;
    return decimalToCents(decimalValue);
  };

  const typedIsCurrent = parseInputToCents(rawInput) === value;
  const formattedDisplayValue =
    isFocused && typedIsCurrent
      ? limitDecimals(rawInput)
      : computedDisplayValue;

  const handleChange = (text: string) => {
    const cleaned = extractDigits(text);

    if (!cleaned || cleaned === "") {
      setRawInput("");
      onChange(0);
      return;
    }

    const limited = limitDecimals(cleaned);
    setRawInput(limited);

    const cents = parseInputToCents(limited);

    let constrainedCents = cents;
    if (min !== undefined && cents < min) {
      constrainedCents = min;
      const constrainedDecimal = centsToDecimal(constrainedCents);
      setRawInput(constrainedDecimal.toFixed(2));
    } else if (max !== undefined && cents > max) {
      constrainedCents = max;
      const constrainedDecimal = centsToDecimal(constrainedCents);
      setRawInput(constrainedDecimal.toFixed(2));
    }

    onChange(constrainedCents);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value > 0) {
      setRawInput(centsToDecimal(value).toString());
    } else {
      setRawInput("");
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (value > 0) {
      const decimal = centsToDecimal(value);
      setRawInput(decimal.toFixed(2));
    } else {
      setRawInput("");
    }
  };

  return (
    <Input
      testID={testID}
      autoFocus={autoFocus}
      accessibilityLabel={accessibilityLabel}
      inputMode="decimal"
      placeholder={placeholder}
      value={formattedDisplayValue}
      onChangeText={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      editable={!disabled}
      keyboardType="decimal-pad"
      {...(className ? { className } : {})}
    />
  );
}
