import type { CurrencyCode } from "@flatsby/validators/expenses/types";
import type { ReactNode } from "react";

import {
  CURRENCY_CODES,
  isCurrencyCode,
} from "@flatsby/validators/expenses/types";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";
import { BottomSheetPickerTrigger } from "~/lib/ui/bottom-sheet-picker";

const currencyItems: BottomSheetPickerItem[] = CURRENCY_CODES.map((code) => ({
  id: code,
  title: code,
}));

export function CurrencyPicker({
  value,
  onChange,
  disabled,
  trigger,
  testID,
}: {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  trigger?: ReactNode;
  testID?: string;
}) {
  return (
    <BottomSheetPickerTrigger
      testID={testID}
      items={currencyItems}
      selectedId={value}
      onSelect={(item) => {
        if (isCurrencyCode(item.id)) onChange(item.id);
      }}
      triggerTitle={value}
      trigger={trigger}
      disabled={disabled}
    />
  );
}
