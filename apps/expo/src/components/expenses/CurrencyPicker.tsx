import type { CurrencyCode } from "@flatsby/validators/expenses/types";

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
  testID,
}: {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
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
      disabled={disabled}
    />
  );
}
