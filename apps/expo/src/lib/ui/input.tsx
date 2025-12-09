import type { TextInputProps } from "react-native";
import * as React from "react";
import { TextInput } from "react-native";
import { tv } from "tailwind-variants";

import { useThemeColors } from "../utils";

const inputVariants = tv({
  base: "h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground text-justify",
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
  className?: string;
  error?: boolean;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, error, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const { getColor } = useThemeColors();

    return (
      <TextInput
        className={inputVariants({
          className,
          error,
          focused: isFocused,
        })}
        ref={ref}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={getColor("muted-foreground")}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
