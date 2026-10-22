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

const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) => (
  <View className={separatorVariants({ orientation, className })} {...props} />
);

export { Separator };
