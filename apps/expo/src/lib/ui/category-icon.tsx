import type LucideIcon from "@react-native-vector-icons/lucide";
import type { ComponentProps } from "react";

import type { IconProps } from "~/lib/ui/custom/icons/Icon";
import { StyledIcon } from "~/lib/nativewind-setup";

interface CategoryIconProps {
  name: IconProps["name"];
  size: number;
  color: string;
}

export function CategoryIcon({ name, size, color }: CategoryIconProps) {
  return (
    <StyledIcon
      name={name as ComponentProps<typeof LucideIcon>["name"]}
      size={size}
      color={color}
    />
  );
}
