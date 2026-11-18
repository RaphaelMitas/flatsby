import type { MessageKey } from "@flatsby/i18n/message-key";
import type * as React from "react";
import { Text } from "react-native";
import { useTranslations } from "use-intl";

import type { BadgeProps } from "./badge";
import { cn } from "~/lib/utils";
import { Badge, badgeVariants } from "./badge";

export interface CategoryBadgeData {
  name: MessageKey;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface CategoryBadgeProps extends Omit<
  BadgeProps,
  "icon" | "label" | "variant" | "children"
> {
  category: CategoryBadgeData;
  filled?: boolean;
}

export function CategoryBadge({
  category,
  filled = true,
  size,
  className,
  ...props
}: CategoryBadgeProps) {
  const t = useTranslations();

  return (
    <Badge
      icon={category.icon}
      variant="outline"
      size={size}
      className={cn(
        category.borderColor,
        filled && category.bgColor,
        className,
      )}
      {...props}
    >
      <Text
        className={badgeVariants({ size }).text({ className: category.color })}
      >
        {t(category.name)}
      </Text>
    </Badge>
  );
}
