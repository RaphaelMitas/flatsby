import * as React from "react";
import { View } from "react-native";
import { tv } from "tailwind-variants";

const separatorVariants = tv({
  base: "bg-border",
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

interface SeparatorProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

const Separator = React.forwardRef<View, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <View
      ref={ref}
      className={separatorVariants({ orientation, className })}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

export { Separator };
