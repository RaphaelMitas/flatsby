import type { ComponentProps } from "react";
import LucideIcon from "@react-native-vector-icons/lucide";

import type { ColorName } from "~/lib/utils";
import { cn, useThemeColors } from "~/lib/utils";
import AppleIcon from "./AppleIcon";
import FlatsbyIcon from "./FlatsbyIcon";
import GoogleIcon from "./GoogleIcon";

export interface IconProps {
  name:
    | ComponentProps<typeof LucideIcon>["name"]
    | "google"
    | "apple"
    | "flatsby"
    | "loader";
  color?: ColorName;
  size: number;
  className?: string;
}

const Icon = ({ name, color, size, className }: IconProps) => {
  const { getColor } = useThemeColors();
  const colorValue = color ? getColor(color) : "currentColor";

  if (name === "google") {
    return <GoogleIcon size={size} color={colorValue} className={className} />;
  }

  if (name === "apple") {
    return <AppleIcon size={size} color={colorValue} className={className} />;
  }

  if (name === "flatsby") {
    return (
      <FlatsbyIcon size={size} color={colorValue} className={className} />
    );
  }

  return (
    <LucideIcon
      name={name === "loader" ? "loader-circle" : name}
      size={size}
      color={colorValue}
      className={cn(className, name === "loader" ? "animate-spin" : undefined)}
    />
  );
};

export default Icon;
