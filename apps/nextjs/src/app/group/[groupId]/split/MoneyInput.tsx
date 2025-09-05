import * as React from "react";

import { Input } from "@flatsby/ui/input";

interface MoneyInputProps {
  value: number; // cents
  onChange: (nextCents: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function convertCentsToDisplayString(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  const majorUnits = (cents / 100).toFixed(2);
  return majorUnits;
}

function normalizeAndLimitTwoDecimals(input: string): {
  display: string;
  cents: number;
} {
  if (!input) {
    return { display: "", cents: 0 };
  }

  // Replace comma with dot and remove invalid characters except first dot
  const replaced = input.replace(/,/g, ".");
  const hadDot = replaced.includes(".");
  const [rawInts = "", rawDecs = ""] = replaced.split(".");
  const intPart = rawInts.replace(/\D/g, "");
  const decPart = rawDecs.replace(/\D/g, "").slice(0, 2);

  let display = intPart;
  if (hadDot) {
    display += "." + decPart;
  }

  // Calculate cents from parts
  const ints = intPart.length ? parseInt(intPart, 10) : 0;
  let cents = ints * 100;
  if (decPart.length > 0) {
    const padded = (decPart + "00").slice(0, 2);
    cents += parseInt(padded, 10);
  }

  return { display, cents };
}

const MoneyInputInner: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}) => {
  const [display, setDisplay] = React.useState<string>(
    value === 0 ? "" : convertCentsToDisplayString(value),
  );
  const [isFocused, setIsFocused] = React.useState<boolean>(false);

  // Sync when external value changes (e.g., form reset). Do not fight user typing.
  React.useEffect(() => {
    if (isFocused) return;
    if (value === 0) {
      setDisplay("");
      return;
    }
    setDisplay(convertCentsToDisplayString(value));
  }, [value, isFocused]);

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      value={display}
      onChange={(e) => {
        const { display: nextDisplay, cents } = normalizeAndLimitTwoDecimals(
          e.target.value,
        );
        setDisplay(nextDisplay);
        onChange(cents);
      }}
      onFocus={() => {
        setIsFocused(true);
      }}
      onBlur={() => {
        // Force two decimals on blur
        setIsFocused(false);
        setDisplay(value === 0 ? "" : convertCentsToDisplayString(value));
      }}
    />
  );
};

export const MoneyInput = React.memo(MoneyInputInner);

export default MoneyInput;
