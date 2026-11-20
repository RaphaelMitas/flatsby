import type * as React from "react";
import type { VariantProps } from "tailwind-variants";
import { Text } from "react-native";
import { tv } from "tailwind-variants";

const labelVariants = tv({
  base: "text-sm font-medium leading-none text-foreground",
});

interface LabelProps extends VariantProps<typeof labelVariants> {
  className?: string;
  children: React.ReactNode;
  htmlFor?: string;
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
