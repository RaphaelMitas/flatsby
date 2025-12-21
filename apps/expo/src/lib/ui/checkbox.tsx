"use client";

import * as React from "react";
import { Pressable, View } from "react-native";

import { cn } from "../utils";
import Icon from "./custom/icons/Icon";

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
            "border-primary focus-visible:ring-ring h-6 w-6 shrink-0 rounded-full border shadow focus-visible:ring-1 focus-visible:outline-none",
            checked && "bg-primary",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <View className="flex-1 items-center justify-center">
            {checked && (
              <Icon name="check" size={16} color="primary-foreground" />
            )}
          </View>
        </View>
      </Pressable>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
