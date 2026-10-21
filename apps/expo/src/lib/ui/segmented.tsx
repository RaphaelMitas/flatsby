import { Pressable, Text, View } from "react-native";

import type { IconProps } from "./custom/icons/Icon";
import { cn } from "../utils";
import Icon from "./custom/icons/Icon";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconProps["name"];
  testID?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <View className="bg-muted flex-row rounded-lg p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={cn(
              "flex-row items-center justify-center gap-1.5 rounded-lg",
              size === "sm" ? "px-3 py-1" : "flex-1 py-2",
              // Opaque even when inactive: Android drops the radius when a background appears from none (react-native#52415)
              active ? "bg-background shadow-sm" : "bg-muted",
            )}
          >
            {option.icon && (
              <Icon
                name={option.icon}
                size={16}
                color={active ? "foreground" : "muted-foreground"}
              />
            )}
            <Text
              className={cn(
                "text-sm",
                active
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground font-medium",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
