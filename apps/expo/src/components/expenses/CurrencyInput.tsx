import type { TextInput } from "react-native";
import { useMemo, useRef, useState } from "react";

import {
  centsToDecimal,
  decimalToCents,
} from "@flatsby/validators/expenses/conversion";

import { Input } from "~/lib/ui/input";

interface CurrencyInputProps {
  value: number; // Value in cents
  onChange: (cents: number) => void;
  placeholder?: string;
  className?: string;
  min?: number; // Minimum value in cents
  max?: number; // Maximum value in cents
  disabled?: boolean;
}

/**
 * Currency input component optimized for mobile that allows standard decimal input.
 *
 * Behavior:
 * - User types "12.3" or "12,3" → displays "12.3" (comma converted to period)
 * - User types "12.34" or "12,34" → displays "12.34"
 * - User types "12.345" or "12,345" → limits to "12.34" (max 2 decimals)
 * - On blur: formats to 2 decimal places (e.g., "12.3" → "12.30")
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  className,
  min,
  max,
  disabled,
}: CurrencyInputProps) {
  const [rawInput, setRawInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Extract only digits and decimal separators (both . and ,) from input
  // Convert comma to period for internal processing
  const extractDigits = (input: string): string => {
    // Replace comma with period, then clean
    const normalized = input.replace(/,/g, ".");
    const cleaned = normalized.replace(/[^\d.]/g, "");
    // Allow only the first decimal separator
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    return cleaned;
  };

  // Limit decimal places to 2
  const limitDecimals = (input: string): string => {
    if (!input.includes(".")) return input;
    const parts = input.split(".");
    const integerPart = parts[0] ?? "";
    const decimalPart = parts[1] ?? "";
    // Limit to 2 decimal places
    const limitedDecimal = decimalPart.slice(0, 2);
    return decimalPart.length > 0
      ? `${integerPart}.${limitedDecimal}`
      : integerPart + (input.endsWith(".") ? "." : "");
  };

  // Compute display value from prop when not focused
  const computedDisplayValue = useMemo(() => {
    if (value === 0) return "";
    return centsToDecimal(value).toFixed(2);
  }, [value]);

  // Format raw input for display when focused
  const formattedDisplayValue = useMemo(() => {
    if (!isFocused) return computedDisplayValue;
    if (!rawInput || rawInput === "") return "";
    // Show as typed, but limit to 2 decimals
    return limitDecimals(rawInput);
  }, [isFocused, rawInput, computedDisplayValue]);

  // Parse input string to cents
  const parseInputToCents = (input: string): number => {
    const cleaned = extractDigits(input);
    if (!cleaned || cleaned === "") {
      return 0;
    }

    // Limit decimals before parsing
    const limited = limitDecimals(cleaned);
    const decimalValue = parseFloat(limited) || 0;
    return decimalToCents(decimalValue);
  };

  const handleChange = (text: string) => {
    // Extract and normalize (comma → period)
    const cleaned = extractDigits(text);

    // If empty, clear
    if (!cleaned || cleaned === "") {
      setRawInput("");
      onChange(0);
      return;
    }

    // Limit decimals and store (always uses period internally)
    const limited = limitDecimals(cleaned);
    setRawInput(limited);

    // Parse to cents
    const cents = parseInputToCents(limited);

    // Apply min/max constraints
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
    // Initialize raw input from current value
    if (value > 0) {
      const decimal = centsToDecimal(value);
      // Remove trailing zeros for easier editing (e.g., "12.30" → "12.3")
      const decimalStr = decimal.toString();
      setRawInput(decimalStr.replace(/\.?0+$/, "") || "0");
    } else {
      setRawInput("");
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format to 2 decimal places on blur
    if (value > 0) {
      const decimal = centsToDecimal(value);
      setRawInput(decimal.toFixed(2));
    } else {
      setRawInput("");
    }
  };

  return (
    <Input
      ref={inputRef}
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
