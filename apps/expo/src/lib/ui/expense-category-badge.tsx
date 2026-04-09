import { Text } from "react-native";

import type { BadgeProps } from "./badge";
import type { CategoryColorVariant } from "~/components/expenses/ExpenseCategoryConfig";
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
  variant = "ghost",
  ...props
}: ExpenseCategoryBadgeProps) {
  const colorVariant: CategoryColorVariant =
    variant === "default" ? "inverted" : "default";
  const categoryData = getExpenseCategoryData({
    subcategoryId,
    colorVariant,
  });

  if (!categoryData) {
    return null;
  }

  return (
    <Badge icon={categoryData.icon} variant={variant} {...props}>
      {showLabel && (
        <Text className={cn("text-base", categoryData.color)}>
          {categoryData.name}
        </Text>
      )}
      {children}
    </Badge>
  );
}
