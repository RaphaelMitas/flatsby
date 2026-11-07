import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { cn } from "~/lib/utils";

export function Chip({
  label,
  active,
  onPress,
  testID,
  children,
  trailing,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2 rounded-full border px-3 py-1.5",
        // Opaque even when inactive: Android drops the radius when a background appears from none (react-native#52415)
        active ? "border-primary bg-primary" : "border-border bg-background",
      )}
    >
      {children}
      <Text
        className={cn(
          "text-sm font-medium",
          active ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}
