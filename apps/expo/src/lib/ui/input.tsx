import type { ReactNode } from "react";
import type { TextInputProps } from "react-native";
import * as React from "react";
import { TextInput, View } from "react-native";
import { tv } from "tailwind-variants";

import { useThemeColors } from "../utils";

const inputVariants = tv({
  base: "w-full rounded-lg border border-input bg-background text-foreground",
  variants: {
    size: {
      default: "h-12 px-4 py-2",
      sm: "h-10 px-3 py-0",
    },
    adorned: {
      true: "flex-row items-center gap-2",
    },
    focused: {
      true: "border-primary",
    },
    error: {
      true: "border-destructive",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface InputProps extends TextInputProps {
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
  className?: string;
  error?: boolean;
  size?: "default" | "sm";
  leading?: ReactNode;
  trailing?: ReactNode;
}

const Input = ({
  ref,
  className,
  error,
  size,
  leading,
  trailing,
  onFocus,
  onBlur,
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const { getColor } = useThemeColors();
  const adorned = leading !== undefined || trailing !== undefined;

  const input = (
    <TextInput
      ref={ref}
      className={
        adorned
          ? "text-foreground flex-1 self-stretch py-0"
          : inputVariants({ className, size, error, focused: isFocused })
      }
      onFocus={(e) => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      placeholderTextColor={getColor("muted-foreground")}
      {...props}
    />
  );

  if (!adorned) return input;

  return (
    <View
      className={inputVariants({
        className,
        size,
        error,
        adorned,
        focused: isFocused,
      })}
    >
      {leading}
      {input}
      {trailing}
    </View>
  );
};

export { Input };
