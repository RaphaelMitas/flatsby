import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { Text, useColorScheme, View } from "react-native";

import { Card, CardContent } from "~/lib/ui/card";
import { Checkbox } from "~/lib/ui/checkbox";
import { cn } from "~/lib/utils";
import { getCategoryData } from "./ShoppingListCategory";

export interface ShoppingItemDisplayProps {
  name: string;
  completed: boolean;
  categoryId: CategoryIdWithAiAutoSelect | null;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ShoppingItemDisplay({
  name,
  completed,
  categoryId,
  onCheckedChange,
  disabled,
  className,
}: ShoppingItemDisplayProps) {
  const isDark = useColorScheme() === "dark";
  const categoryData = categoryId
    ? getCategoryData({ categoryId, isDark })
    : null;

  return (
    <Card>
      <CardContent
        className={cn(
          "flex-row items-center gap-2 py-0 pr-3 pl-0",
          disabled && "opacity-70",
          className,
        )}
      >
        <Checkbox
          checked={completed}
          onCheckedChange={onCheckedChange}
          disabled={disabled ?? !onCheckedChange}
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
        {categoryData && (
          <View className="flex-row items-center gap-2">
            {categoryData.icon}
            <Text
              className="text-xs font-medium"
              style={{ color: categoryData.nativeColors.text }}
            >
              {categoryData.name}
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
}
