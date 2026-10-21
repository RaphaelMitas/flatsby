import type { TextInputProps } from "react-native";
import * as React from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";

import { useThemeColors } from "../utils";

const inputVariants = tv({
  base: "h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground",
  variants: {
    focused: {
      true: "border-primary",
    },
    error: {
      true: "border-destructive",
    },
  },
});

interface InputProps extends TextInputProps {
  ref?: React.Ref<React.ComponentRef<typeof TextInput>>;
  className?: string;
  error?: boolean;
}

const Input = ({
  ref,
  className,
  error,
  onFocus,
  onBlur,
  ...props
}: InputProps) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const { getColor } = useThemeColors();

  return (
    <TextInput
      ref={ref}
      className={inputVariants({
        className,
        error,
        focused: isFocused,
      })}
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
};

export { Input };
