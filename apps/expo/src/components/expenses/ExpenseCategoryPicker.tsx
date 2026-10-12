import type { ExpenseSubcategoryId } from "@flatsby/validators/expenses/categories";
import { useMemo } from "react";
import { View } from "react-native";

import {
  AI_AUTO_DETECT,
  expenseSubcategoryIdsWithAuto,
  isExpenseSubcategoryId,
} from "@flatsby/validators/expenses/categories";

import type {
  BottomSheetPickerItem,
  BottomSheetPickerTriggerProps,
} from "~/lib/ui/bottom-sheet-picker";
import { BottomSheetPickerTrigger } from "~/lib/ui/bottom-sheet-picker";
import { getExpenseCategoryData } from "./ExpenseCategoryConfig";

export interface ExpenseCategoryPickerProps extends Omit<
  BottomSheetPickerTriggerProps,
  "items" | "title"
> {
  value?: ExpenseSubcategoryId;
  onChange: (value: ExpenseSubcategoryId | undefined) => void;
  autoDetect: boolean;
}

export function ExpenseCategoryPicker({
  value,
  onChange,
  triggerTitle,
  autoDetect,
  ...props
}: ExpenseCategoryPickerProps) {
  const categoryItems = useMemo(() => {
    const items: BottomSheetPickerItem[] = [];
    for (const subcategoryId of expenseSubcategoryIdsWithAuto) {
      if (!autoDetect && subcategoryId === AI_AUTO_DETECT) continue;
      const data = getExpenseCategoryData({ subcategoryId });
      items.push({
        id: subcategoryId,
        title: data.name,
        description: data.description,
        icon: (
          <View className="flex items-center justify-center">{data.icon}</View>
        ),
      });
    }
    return items;
  }, [autoDetect]);

  const handleSelect = (item: BottomSheetPickerItem) => {
    if (item.id === AI_AUTO_DETECT) onChange(undefined);
    else if (isExpenseSubcategoryId(item.id)) onChange(item.id);
  };

  const displayTitle =
    triggerTitle ??
    getExpenseCategoryData({ subcategoryId: value ?? AI_AUTO_DETECT }).name;

  return (
    <BottomSheetPickerTrigger
      items={categoryItems}
      selectedId={value ?? AI_AUTO_DETECT}
      onSelect={handleSelect}
      triggerTitle={displayTitle}
      {...props}
    />
  );
}
