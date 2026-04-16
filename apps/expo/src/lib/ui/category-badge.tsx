import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { Text } from "react-native";

import type { BadgeProps } from "./badge";
import { getCategoryData } from "~/components/shoppingList/ShoppingListCategory";
import { cn } from "~/lib/utils";
import { Badge } from "./badge";

export interface CategoryBadgeProps extends Omit<BadgeProps, "icon" | "label"> {
  categoryId: CategoryIdWithAiAutoSelect;
  showLabel?: boolean;
}

export function CategoryBadge({
  categoryId,
  showLabel = true,
  children,
  variant = "ghost",
  className,
  ...props
}: CategoryBadgeProps) {
  const categoryData = getCategoryData({
    categoryId,
    colorVariant: variant === "default" ? "inverted" : "default",
  });

  return (
    <Badge
      icon={categoryData.icon}
      variant={variant}
      className={cn(categoryData.bgColor, categoryData.borderColor, className)}
      {...props}
    >
      {showLabel && (
        <Text className={cn("text-base", categoryData.color)}>
          {categoryData.name}
        </Text>
      )}
      {children}
    </Badge>
  );
}
