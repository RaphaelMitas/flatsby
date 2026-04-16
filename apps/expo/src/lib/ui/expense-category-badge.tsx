import { Text, useColorScheme } from "react-native";

import type { BadgeProps } from "./badge";
import { getExpenseCategoryData } from "~/components/expenses/ExpenseCategoryConfig";
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
  const isDark = useColorScheme() === "dark";
  const categoryData = getExpenseCategoryData({
    subcategoryId,
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
        <Text
          className="text-xs font-medium"
          style={{ color: nativeColors.text }}
        >
          {categoryData.name}
        </Text>
      )}
      {children}
    </Badge>
  );
}
