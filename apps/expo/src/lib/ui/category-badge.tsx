import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { Text, useColorScheme } from "react-native";

import type { BadgeProps } from "./badge";
import { getCategoryData } from "~/components/shoppingList/ShoppingListCategory";
import { Badge } from "./badge";

export interface CategoryBadgeProps extends Omit<BadgeProps, "icon" | "label"> {
  categoryId: CategoryIdWithAiAutoSelect;
  showLabel?: boolean;
}

export function CategoryBadge({
  categoryId,
  showLabel = true,
  children,
  variant = "outline",
  className,
  ...props
}: CategoryBadgeProps) {
  const isDark = useColorScheme() === "dark";
  const categoryData = getCategoryData({
    categoryId,
    isDark,
  });
  const { nativeColors } = categoryData;

  return (
    <Badge
      icon={categoryData.icon}
      variant={variant}
      className={className}
      style={{
        backgroundColor: nativeColors.bg,
        borderColor: nativeColors.border,
        borderWidth: 1,
      }}
      {...props}
    >
      {showLabel && (
        <Text className="text-base" style={{ color: nativeColors.text }}>
          {categoryData.name}
        </Text>
      )}
      {children}
    </Badge>
  );
}
