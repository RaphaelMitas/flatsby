import type { ExpenseSubcategoryId } from "@flatsby/validators/expenses/categories";
import { useMemo } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";

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
  "items" | "title" | "triggerTitle" | "iconButton"
> {
  value?: ExpenseSubcategoryId;
  onChange: (value: ExpenseSubcategoryId | undefined) => void;
  autoDetect: boolean;
}

export function ExpenseCategoryPicker({
  value,
  onChange,
  autoDetect,
  ...props
}: ExpenseCategoryPickerProps) {
  const t = useTranslations();
  const categoryItems = useMemo(() => {
    const items: BottomSheetPickerItem[] = [];
    for (const subcategoryId of expenseSubcategoryIdsWithAuto) {
      if (!autoDetect && subcategoryId === AI_AUTO_DETECT) continue;
      const data = getExpenseCategoryData({ subcategoryId });
      items.push({
        id: subcategoryId,
        title: t(data.name),
        description: t(data.description),
        icon: (
          <View className="flex items-center justify-center">{data.icon}</View>
        ),
      });
    }
    return items;
  }, [autoDetect, t]);

  const handleSelect = (item: BottomSheetPickerItem) => {
    if (item.id === AI_AUTO_DETECT) onChange(undefined);
    else if (isExpenseSubcategoryId(item.id)) onChange(item.id);
  };

  return (
    <BottomSheetPickerTrigger
      items={categoryItems}
      selectedId={value ?? AI_AUTO_DETECT}
      onSelect={handleSelect}
      triggerTitle={t(
        getExpenseCategoryData({ subcategoryId: value ?? AI_AUTO_DETECT }).name,
      )}
      {...props}
    />
  );
}
