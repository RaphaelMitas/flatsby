import type * as React from "react";
import type { VariantProps } from "tailwind-variants";
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

const Alert = ({
  className,
  variant = "default",
  children,
  ...props
}: AlertProps) => (
  <View className={alertVariants({ variant, className })} {...props}>
    {children}
  </View>
);

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

const AlertTitle = ({
  className,
  children,
  variant = "default",
  ...props
}: AlertTitleProps) => (
  <Text className={alertTitleVariants({ variant, className })} {...props}>
    {children}
  </Text>
);

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

const AlertDescription = ({
  className,
  children,
  variant = "default",
  ...props
}: AlertDescriptionProps) => (
  <Text className={alertDescriptionVariants({ variant, className })} {...props}>
    {children}
  </Text>
);

export { Alert, AlertTitle, AlertDescription };
