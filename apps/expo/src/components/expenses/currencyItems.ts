import { CURRENCY_CODES } from "@flatsby/validators/expenses/types";

import type { BottomSheetPickerItem } from "~/lib/ui/bottom-sheet-picker";

export const currencyItems: BottomSheetPickerItem[] = CURRENCY_CODES.map(
  (code) => ({ id: code, title: code }),
);
