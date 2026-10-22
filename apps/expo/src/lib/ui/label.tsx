import type * as React from "react";
import type { VariantProps } from "tailwind-variants";
import { Text } from "react-native";
import { tv } from "tailwind-variants";

const labelVariants = tv({
  base: "text-sm font-medium leading-none text-primary",
});

interface LabelProps extends VariantProps<typeof labelVariants> {
  className?: string;
  children: React.ReactNode;
  htmlFor?: string; // Keep for compatibility but not used in React Native
}

const Label = ({
  className,
  children,
  htmlFor: _htmlFor,
  ...props
}: LabelProps) => (
  <Text className={labelVariants({ className })} {...props}>
    {children}
  </Text>
);

export { Label };
