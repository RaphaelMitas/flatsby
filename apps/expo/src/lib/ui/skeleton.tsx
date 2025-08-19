import type { VariantProps } from "tailwind-variants";
import * as React from "react";
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
  base: "bg-muted rounded-md overflow-hidden",
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
  extends React.ComponentProps<typeof View>,
    VariantProps<typeof skeletonVariants> {
  animated?: boolean;
  children?: React.ReactNode;
}

const Skeleton = React.forwardRef<View, SkeletonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      animated = true,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const opacity = useSharedValue(0.5);

    useEffect(() => {
      if (!animated) {
        opacity.value = 1;
        return;
      }

      opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }, [animated, opacity]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: animated ? opacity.value : 1,
      };
    });

    const ViewComponent = animated ? Animated.View : View;

    return (
      <ViewComponent
        ref={ref}
        className={skeletonVariants({ variant, size, width, className })}
        style={[style, animatedStyle]}
        {...props}
      >
        {children}
      </ViewComponent>
    );
  },
);

Skeleton.displayName = "Skeleton";

// Predefined skeleton components for common use cases
const SkeletonText = React.forwardRef<
  View,
  Omit<SkeletonProps, "variant"> & { lines?: number }
>(({ lines = 1, className, ...props }, ref) => {
  if (lines === 1) {
    return (
      <Skeleton ref={ref} variant="text" className={className} {...props} />
    );
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
});

SkeletonText.displayName = "SkeletonText";

const SkeletonAvatar = React.forwardRef<View, Omit<SkeletonProps, "variant">>(
  ({ size = "xl", className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="rounded"
      size={size}
      width={size}
      className={className}
      {...props}
    />
  ),
);

SkeletonAvatar.displayName = "SkeletonAvatar";

const SkeletonCard = React.forwardRef<View, Omit<SkeletonProps, "variant">>(
  ({ className, children, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="card"
      className={`p-6 ${className}`}
      {...props}
    >
      {children ?? (
        <View className="gap-4">
          <View className="flex-row items-center gap-4">
            <SkeletonAvatar size="lg" />
            <View className="flex-1 gap-2">
              <SkeletonText size="lg" width="2xl" />
              <SkeletonText size="sm" width="lg" />
            </View>
          </View>
          <View className="gap-2">
            <SkeletonText lines={3} />
          </View>
        </View>
      )}
    </Skeleton>
  ),
);

SkeletonCard.displayName = "SkeletonCard";

const SkeletonButton = React.forwardRef<View, Omit<SkeletonProps, "variant">>(
  ({ size = "lg", width = "lg", className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="default"
      size={size}
      width={width}
      className={`rounded-md ${className}`}
      {...props}
    />
  ),
);

SkeletonButton.displayName = "SkeletonButton";

const SkeletonList = React.forwardRef<
  View,
  Omit<SkeletonProps, "variant"> & { items?: number }
>(({ items = 3, className, ...props }, ref) => (
  <View ref={ref} className={`gap-4 ${className}`} {...props}>
    {Array.from({ length: items }).map((_, index) => (
      <SkeletonText
        size="3xl"
        key={index}
        className="flex-row items-center gap-4"
      />
    ))}
  </View>
));

SkeletonList.displayName = "SkeletonList";

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonButton,
  SkeletonList,
  skeletonVariants,
  type SkeletonProps,
};
