import type { describeExpenseRow } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { amountTone } from "@flatsby/validators/expenses/formatting";

import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { getExpenseCategoryData } from "./ExpenseCategoryConfig";

export interface ExpenseDisplayProps {
  row: ReturnType<typeof describeExpenseRow>;
  subcategory: string;
  isNotConverted?: boolean;
  isSelected?: boolean;
  first: boolean;
  last: boolean;
}

export function ExpenseDisplay({
  row,
  subcategory,
  isNotConverted,
  isSelected,
  first,
  last,
}: ExpenseDisplayProps) {
  const t = useTranslations("expenses");
  const category = getExpenseCategoryData({ subcategoryId: subcategory });

  return (
    <View
      className={cn(
        "bg-card border-border min-h-14 flex-row items-center gap-3 border-t border-r border-l px-3 py-2.5",
        first && "rounded-t-lg",
        last && "rounded-b-lg border-b",
        isSelected && "bg-muted",
      )}
    >
      <View
        className={cn(
          "h-9 w-9 items-center justify-center rounded-full",
          row.isSettlement ? "bg-muted" : category.bgColor,
        )}
      >
        {row.isSettlement ? (
          <Icon name="arrow-left-right" size={14} color="muted-foreground" />
        ) : (
          category.icon
        )}
      </View>
      <View className="flex-1">
        <Text
          className="text-foreground text-base font-medium"
          numberOfLines={1}
        >
          {row.title}
        </Text>
        <Text className="text-muted-foreground text-sm" numberOfLines={1}>
          {[row.payer, row.paid].filter(Boolean).join(" · ")}
          {isNotConverted && (
            <Text className="text-warning">
              {` · ${t("conversion.notConverted")}`}
            </Text>
          )}
          {` · ${row.date}`}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={cn(
            "text-base font-semibold",
            row.isSettlement ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {row.amount}
        </Text>
        {row.balance && (
          <Text className={cn("text-xs", amountTone(row.balance.cents))}>
            {row.balance.text}
          </Text>
        )}
      </View>
    </View>
  );
}
