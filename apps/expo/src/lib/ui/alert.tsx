import type { VariantProps } from "tailwind-variants";
import * as React from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

const alertVariants = tv({
  base: "relative w-full rounded-lg border px-4 py-3",
  variants: {
    variant: {
      default: "border-border bg-background",
      destructive: "border-destructive/50 bg-destructive/10",
      info: "border-info/50 bg-info/10",
      success: "border-success/50 bg-success/10",
      warning: "border-warning/50 bg-warning/10",
      error: "border-error/50 bg-error/10",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface AlertProps extends VariantProps<typeof alertVariants> {
  className?: string;
  children: React.ReactNode;
}

const Alert = React.forwardRef<View, AlertProps>(
  ({ className, variant = "default", children, ...props }, ref) => (
    <View
      ref={ref}
      className={alertVariants({ variant, className })}
      {...props}
    >
      {children}
    </View>
  ),
);
Alert.displayName = "Alert";

const alertTitleVariants = tv({
  base: "mb-1 text-sm font-medium leading-none tracking-tight",
  variants: {
    variant: {
      default: "text-foreground",
      success: "text-success",
      destructive: "text-destructive",
      info: "text-info",
      warning: "text-warning",
      error: "text-error",
    },
  },
});

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
  variant?: VariantProps<typeof alertTitleVariants>["variant"];
}

const AlertTitle = React.forwardRef<Text, AlertTitleProps>(
  ({ className, children, variant = "default", ...props }, ref) => (
    <Text
      ref={ref}
      className={alertTitleVariants({ variant, className })}
      {...props}
    >
      {children}
    </Text>
  ),
);
AlertTitle.displayName = "AlertTitle";

const alertDescriptionVariants = tv({
  base: "text-sm leading-relaxed",
  variants: {
    variant: {
      default: "text-foreground",
      success: "text-success",
      destructive: "text-destructive",
      info: "text-info",
      warning: "text-warning",
      error: "text-error",
    },
  },
});

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
  variant?: VariantProps<typeof alertDescriptionVariants>["variant"];
}

const AlertDescription = React.forwardRef<Text, AlertDescriptionProps>(
  ({ className, children, variant = "default", ...props }, ref) => (
    <Text
      ref={ref}
      className={alertDescriptionVariants({ variant, className })}
      {...props}
    >
      {children}
    </Text>
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
