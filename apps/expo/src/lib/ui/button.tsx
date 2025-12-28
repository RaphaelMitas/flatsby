import type { PressableProps } from "react-native";
import type { VariantProps } from "tailwind-variants";
import * as React from "react";
import { Pressable, Text } from "react-native";
import { tv } from "tailwind-variants";

import type { IconProps } from "./custom/icons/Icon";
import Icon from "./custom/icons/Icon";

const buttonVariants = tv({
  base: "flex-row items-center justify-center rounded-lg transition-colors gap-2",
  variants: {
    variant: {
      primary: "bg-primary",
      destructive: "bg-destructive",
      outline: "border border-input bg-background",
      secondary: "bg-secondary",
      ghost: "bg-transparent",
      link: "bg-transparent",
      disabled: "bg-muted",
    },
    size: {
      sm: "px-3 py-2",
      md: "px-4 py-3",
      lg: "px-4 py-3",
      icon: "p-4",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

const buttonTextVariants = tv({
  base: "text-sm font-medium",
  variants: {
    variant: {
      primary: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary underline",
      disabled: "text-muted-foreground",
    },
    size: {
      sm: "text-sm",
      md: "text-md",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "lg",
  },
});

const iconVariants = {
  primary: "primary-foreground",
  destructive: "destructive-foreground",
  outline: "foreground",
  secondary: "secondary-foreground",
  ghost: "foreground",
  link: "primary",
  disabled: "muted-foreground",
} as const;

interface ButtonProps
  extends PressableProps, VariantProps<typeof buttonVariants> {
  title?: string;
  icon?: IconProps["name"];
}

const Button = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, title, icon, disabled, ...props }, ref) => {
  return (
    <Pressable
      ref={ref}
      className={buttonVariants({
        variant: disabled ? "disabled" : variant,
        size,
        className,
      })}
      disabled={disabled ?? false}
      {...props}
    >
      {icon && (
        <Icon
          name={icon}
          size={16}
          color={
            disabled
              ? iconVariants.disabled
              : variant === undefined
                ? iconVariants.primary
                : iconVariants[variant]
          }
        />
      )}
      {title && size !== "icon" && (
        <Text
          disabled={disabled ?? false}
          className={buttonTextVariants({
            variant: disabled ? "disabled" : variant,
            size,
          })}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
});

Button.displayName = "Button";

export { Button, type ButtonProps, buttonVariants };
