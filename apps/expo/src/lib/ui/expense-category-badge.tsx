import type { CategoryColorVariant } from "@flatsby/validators/expenses/category-colors";
import { Text } from "react-native";

import type { BadgeProps } from "./badge";
import { getExpenseCategoryData } from "~/components/expenses/ExpenseCategoryConfig";
import { cn } from "~/lib/utils";
import { Badge } from "./badge";

export interface ExpenseCategoryBadgeProps extends Omit<
  BadgeProps,
  "icon" | "label"
> {
  subcategoryId: string;
  showLabel?: boolean;
}

export function ExpenseCategoryBadge({
  subcategoryId,
  showLabel = true,
  children,
  variant,
  className,
  ...props
}: ExpenseCategoryBadgeProps) {
  const colorVariant: CategoryColorVariant =
    variant === "default" ? "inverted" : "default";
  const categoryData = getExpenseCategoryData({
    subcategoryId,
    colorVariant,
  });

  return (
    <Badge
      icon={categoryData.icon}
      variant={variant}
      className={cn(categoryData.bgColor, categoryData.borderColor, className)}
      {...props}
    >
      {showLabel && (
        <Text className={cn("text-xs font-medium", categoryData.color)}>
          {categoryData.name}
        </Text>
      )}
      {children}
    </Badge>
  );
}
