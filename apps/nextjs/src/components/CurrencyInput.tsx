"use client";

import { useMemo, useRef, useState } from "react";

import { Input } from "@flatsby/ui/input";
import {
  centsToDecimal,
  decimalToCents,
} from "@flatsby/validators/expenses/conversion";

interface CurrencyInputProps {
  value: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
  onEnter?: () => void;
  "aria-label"?: string;
  "data-testid"?: string;
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
  enterKeyHint,
  onEnter,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: CurrencyInputProps) {
  const [rawInput, setRawInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const formattedDisplayValue = useMemo(() => {
    if (!isFocused) return computedDisplayValue;
    if (!rawInput || rawInput === "") return "";
    return limitDecimals(rawInput);
  }, [isFocused, rawInput, computedDisplayValue]);

  const parseInputToCents = (input: string): number => {
    const cleaned = extractDigits(input);
    if (!cleaned || cleaned === "") {
      return 0;
    }

    const limited = limitDecimals(cleaned);
    const decimalValue = parseFloat(limited) || 0;
    return decimalToCents(decimalValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleaned = extractDigits(inputValue);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
      return;
    }

    if (
      (e.key === "." || e.key === ",") &&
      formattedDisplayValue.includes(".")
    ) {
      e.preventDefault();
      return;
    }

    if (/^\d$/.test(e.key) && formattedDisplayValue.includes(".")) {
      const parts = formattedDisplayValue.split(".");
      if (parts[1] && parts[1].length >= 2) {
        e.preventDefault();
        return;
      }
    }

    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      ".",
      ",",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];

    if (
      allowedKeys.includes(e.key) ||
      ((e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
    ) {
      return;
    }

    if (/^\d$/.test(e.key)) {
      return;
    }

    e.preventDefault();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const cleaned = extractDigits(pastedText);
    const limited = limitDecimals(cleaned);
    const cents = parseInputToCents(limited);

    let constrainedCents = cents;
    if (min !== undefined && cents < min) {
      constrainedCents = min;
    }
    if (max !== undefined && cents > max) {
      constrainedCents = max;
    }

    if (constrainedCents > 0) {
      const decimal = centsToDecimal(constrainedCents);
      setRawInput(decimal.toString());
    } else {
      setRawInput("");
    }
    onChange(constrainedCents);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={formattedDisplayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={className}
      disabled={disabled}
      autoFocus={autoFocus}
      enterKeyHint={enterKeyHint}
      aria-label={ariaLabel}
      data-testid={dataTestId}
    />
  );
}
