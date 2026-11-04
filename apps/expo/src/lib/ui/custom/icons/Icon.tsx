import type LucideIcon from "@react-native-vector-icons/lucide";
import type { ComponentProps } from "react";
import { ActivityIndicator, View } from "react-native";

import type { ColorName } from "~/lib/utils";
import { StyledIcon } from "~/lib/nativewind-setup";
import { useThemeColors } from "~/lib/utils";
import AppleIcon from "./AppleIcon";
import FlatsbyCat from "./FlatsbyCat";
import GoogleIcon from "./GoogleIcon";
import PasskeyIcon from "./PasskeyIcon";

export interface IconProps {
  name:
    | ComponentProps<typeof LucideIcon>["name"]
    | "google"
    | "apple"
    | "flatsby"
    | "passkey"
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
  if (name === "passkey") {
    return <PasskeyIcon size={size} color={colorValue} className={className} />;
  }
  if (name === "loader") {
    // CSS keyframes don't run on native, so a spinning icon would stand still
    return (
      <View
        style={{ width: size, height: size }}
        className="items-center justify-center"
      >
        <ActivityIndicator
          size="small"
          color={getColor(color ?? "foreground")}
        />
      </View>
    );
  }
  if (name === "flatsby") {
    return <FlatsbyCat size={size} color={colorValue} className={className} />;
  }
  return (
    <StyledIcon
      name={name}
      size={size}
      color={colorValue}
      className={className}
    />
  );
};

export default Icon;
