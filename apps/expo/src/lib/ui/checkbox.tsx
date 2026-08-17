import type { ComponentRef } from "react";
import { forwardRef } from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";

import { cn, useThemeColors } from "../utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

// Geometric length of lucide's check path; react-native-svg has no pathLength
// to normalise it away.
const CHECK_LENGTH = 22.63;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Checkbox = forwardRef<ComponentRef<typeof Pressable>, CheckboxProps>(
  (
    { className, checked = false, onCheckedChange, disabled, ...props },
    ref,
  ) => {
    const { getColor } = useThemeColors();
    const squish = useSharedValue(1);
    // 1 is the resting, finished state, so an untouched checkbox has no ring.
    const ripple = useSharedValue(1);

    const fill = useDerivedValue(() =>
      withSpring(checked ? 1 : 0, {
        damping: 15,
        stiffness: 260,
        overshootClamping: true,
      }),
    );

    const draw = useDerivedValue(() =>
      checked
        ? withTiming(0, { duration: 250 })
        : withTiming(CHECK_LENGTH, { duration: 0 }),
    );

    const handlePress = () => {
      if (disabled || !onCheckedChange) {
        return;
      }

      squish.value = withSequence(
        withTiming(0.85, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 320 }),
      );

      if (!checked) {
        ripple.value = withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) }),
        );
      }

      onCheckedChange(!checked);
    };

    const squishStyle = useAnimatedStyle(() => ({
      transform: [{ scale: squish.value }],
    }));

    const fillStyle = useAnimatedStyle(() => ({
      opacity: fill.value,
      transform: [{ scale: fill.value }],
    }));

    const rippleStyle = useAnimatedStyle(() => ({
      opacity: (1 - ripple.value) * 0.5,
      transform: [{ scale: 1 + ripple.value * 1.1 }],
    }));

    const drawProps = useAnimatedProps(() => ({
      strokeDashoffset: draw.value,
    }));

    return (
      <Pressable
        ref={ref}
        className="items-center justify-center p-4"
        onPress={handlePress}
        disabled={disabled}
        {...props}
      >
        <Animated.View
          pointerEvents="none"
          style={rippleStyle}
          className="border-primary absolute h-6 w-6 rounded-full border-2"
        />
        <Animated.View
          style={squishStyle}
          className={cn(
            "border-primary h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow",
            className,
          )}
        >
          <Animated.View
            style={fillStyle}
            className="bg-primary absolute inset-0 rounded-full"
          />
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none">
            <AnimatedPath
              d="M20 6 9 17l-5-5"
              stroke={getColor("primary-foreground")}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={drawProps}
            />
          </Svg>
        </Animated.View>
      </Pressable>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
