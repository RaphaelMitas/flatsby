"use client";

import * as React from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "../utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  CheckboxProps
>(
  (
    { className, checked = false, onCheckedChange, disabled, ...props },
    ref,
  ) => {
    const handlePress = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <Pressable
        ref={ref}
        className="p-4"
        onPress={handlePress}
        disabled={disabled}
        {...props}
      >
        <View
          className={cn(
            "h-6 w-6 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            checked && "bg-primary",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <View className="flex-1 items-center justify-center">
            {checked && (
              <Text className="text-xs font-bold text-primary-foreground">
                ✓
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
