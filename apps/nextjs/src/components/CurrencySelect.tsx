"use client";

import type { CurrencyCode } from "@flatsby/validators/expenses/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

interface CurrencySelectProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "data-testid"?: string;
}

export function CurrencySelect({
  value,
  onChange,
  disabled,
  id,
  className,
  "data-testid": testId,
}: CurrencySelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isCurrencyCode(next)) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_CODES.map((code) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
