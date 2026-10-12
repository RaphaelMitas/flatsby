import type { ExpenseSubcategoryIdWithAuto } from "@flatsby/validators/expenses/categories";
import { useMemo } from "react";
import { View } from "react-native";

import {
  AI_AUTO_DETECT,
  expenseSubcategoryIdsWithAuto,
  isExpenseSubcategoryIdWithAuto,
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
  value?: ExpenseSubcategoryIdWithAuto;
  onChange?: (value: ExpenseSubcategoryIdWithAuto) => void;
  autoDetect?: boolean;
}

export function ExpenseCategoryPicker({
  value,
  onChange,
  triggerTitle,
  iconButton = false,
  autoDetect = true,
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
    if (isExpenseSubcategoryIdWithAuto(item.id)) {
      onChange?.(item.id);
    }
  };

  const selectedData = value
    ? getExpenseCategoryData({ subcategoryId: value })
    : null;
  const displayTitle = triggerTitle ?? selectedData?.name ?? "Select Category";

  return (
    <BottomSheetPickerTrigger
      items={categoryItems}
      selectedId={value}
      onSelect={handleSelect}
      triggerTitle={displayTitle}
      iconButton={iconButton}
      {...props}
    />
  );
}
