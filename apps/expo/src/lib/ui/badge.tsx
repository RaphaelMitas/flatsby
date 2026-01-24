import type { PressableProps } from "react-native";
import type { VariantProps } from "tailwind-variants";
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

const badgeVariants = tv({
  slots: {
    base: "flex-row items-center gap-1.5 rounded-full px-2.5 py-0.5",
    text: "text-xs font-medium",
    countBase: "rounded-full px-2 py-0.5",
    countText: "text-xs font-medium",
  },
  variants: {
    variant: {
      default: {
        base: "bg-primary",
        text: "text-primary-foreground",
        countBase: "bg-primary-foreground/20",
        countText: "text-primary-foreground",
      },
      secondary: {
        base: "bg-secondary",
        text: "text-secondary-foreground",
        countBase: "bg-muted",
        countText: "text-muted-foreground",
      },
      destructive: {
        base: "bg-destructive",
        text: "text-destructive-foreground",
        countBase: "bg-muted",
        countText: "text-muted-foreground",
      },
      outline: {
        base: "border border-input bg-transparent",
        text: "text-foreground",
        countBase: "bg-muted",
        countText: "text-muted-foreground",
      },
      ghost: {
        base: "bg-transparent",
        text: "text-foreground",
        countBase: "bg-muted",
        countText: "text-muted-foreground",
      },
    },
    size: {
      sm: {
        base: "px-2 py-0.5",
        text: "text-xs",
        countBase: "px-1.5 py-0.5",
        countText: "text-xs",
      },
      md: {
        base: "px-2.5 py-0.5",
        text: "text-xs",
        countBase: "px-1.5 py-0.5",
        countText: "text-xs",
      },
      lg: {
        base: "px-4 py-2",
        text: "text-sm",
        countBase: "px-2 py-0.5",
        countText: "text-sm",
      },
      xl: {
        base: "px-6 py-3",
        text: "text-base",
        countBase: "px-2.5 py-0.5",
        countText: "text-base",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export interface BadgeProps
  extends Omit<PressableProps, "children">, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  count?: number;
}

const Badge = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  BadgeProps
>(
  (
    {
      variant,
      size,
      icon,
      label,
      children,
      className,
      onPress,
      count,
      ...props
    },
    ref,
  ) => {
    const { base, text, countBase, countText } = badgeVariants({
      variant,
      size,
    });
    const content = (
      <>
        {icon}
        {label && <Text className={text()}>{label}</Text>}
        {children}
        {count !== undefined && (
          <View className={countBase()}>
            <Text className={countText()}>{count}</Text>
          </View>
        )}
      </>
    );

    if (onPress) {
      return (
        <Pressable
          ref={ref}
          className={base({ className })}
          onPress={onPress}
          {...props}
        >
          {content}
        </Pressable>
      );
    }

    return <View className={base({ className })}>{content}</View>;
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
