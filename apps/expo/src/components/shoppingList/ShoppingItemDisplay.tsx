import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/lib/ui/card";
import { Checkbox } from "~/lib/ui/checkbox";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { getCategoryData } from "./ShoppingListCategory";

export interface ShoppingItemDisplayProps {
  name: string;
  completed: boolean;
  categoryId: CategoryIdWithAiAutoSelect | null;
  onCheckedChange?: (checked: boolean) => void;
  unsynced?: boolean;
  className?: string;
  checkboxTestID?: string;
  testID?: string;
}

export function ShoppingItemDisplay({
  name,
  completed,
  categoryId,
  onCheckedChange,
  unsynced,
  className,
  checkboxTestID,
  testID,
}: ShoppingItemDisplayProps) {
  const t = useTranslations();
  const categoryData = categoryId ? getCategoryData({ categoryId }) : null;

  return (
    <Card testID={testID}>
      <CardContent
        className={cn("flex-row items-center gap-2 py-0 pr-3 pl-0", className)}
      >
        <Checkbox
          testID={checkboxTestID}
          checked={completed}
          onCheckedChange={onCheckedChange}
          disabled={!onCheckedChange}
        />
        <View className="flex-1">
          <Text
            className={cn(
              "text-sm font-medium",
              completed
                ? "text-muted-foreground line-through"
                : "text-foreground",
            )}
          >
            {name}
          </Text>
        </View>
        {unsynced && (
          <View testID={testID && `${testID}-unsynced`}>
            <Icon name="clock" size={14} color="muted-foreground" />
          </View>
        )}
        {categoryData && (
          <View className="flex-row items-center gap-2">
            {categoryData.icon}
            <Text className={cn("text-xs font-medium", categoryData.color)}>
              {t(categoryData.name)}
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
