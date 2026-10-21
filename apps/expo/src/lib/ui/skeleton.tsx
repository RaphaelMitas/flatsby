import type * as React from "react";
import type { VariantProps } from "tailwind-variants";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { tv } from "tailwind-variants";

const skeletonVariants = tv({
  base: "bg-muted rounded-lg overflow-hidden",
  variants: {
    variant: {
      default: "bg-muted",
      rounded: "rounded-full bg-muted",
      text: "bg-muted rounded-sm",
      card: "bg-muted rounded-xl",
    },
    size: {
      xs: "h-3",
      sm: "h-4",
      md: "h-5",
      lg: "h-6",
      xl: "h-8",
      "2xl": "h-10",
      "3xl": "h-12",
    },
    width: {
      xs: "w-16",
      sm: "w-20",
      md: "w-24",
      lg: "w-32",
      xl: "w-40",
      "2xl": "w-48",
      "3xl": "w-56",
      full: "w-full",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    width: "full",
  },
});

interface SkeletonProps
  extends
    React.ComponentProps<typeof View>,
    VariantProps<typeof skeletonVariants> {
  children?: React.ReactNode;
}

const Skeleton = ({
  className,
  variant,
  size,
  width,
  children,
  style,
  ...props
}: SkeletonProps) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={skeletonVariants({ variant, size, width, className })}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// Predefined skeleton components for common use cases
const SkeletonText = ({
  lines = 1,
  className,
  ...props
}: Omit<SkeletonProps, "variant"> & { lines?: number }) => {
  if (lines === 1) {
    return <Skeleton variant="text" className={className} {...props} />;
  }

  return (
    <View className="gap-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "lg" : "full"}
          className={className}
          {...props}
        />
      ))}
    </View>
  );
};

const SkeletonList = ({
  items = 3,
  className,
  ...props
}: Omit<SkeletonProps, "variant"> & { items?: number }) => (
  <View className={`gap-4 ${className}`} {...props}>
    {Array.from({ length: items }).map((_, index) => (
      <SkeletonText
        size="3xl"
        key={index}
        className="flex-row items-center gap-4"
      />
    ))}
  </View>
);

export { Skeleton, SkeletonText, SkeletonList };
