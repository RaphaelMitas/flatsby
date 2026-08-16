"use client";

import * as React from "react";
import { Pressable } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { cn } from "../utils";
import Icon from "./custom/icons/Icon";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  testID?: string;
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  CheckboxProps
>(
  (
    { className, checked = false, onCheckedChange, disabled, ...props },
    ref,
  ) => {
    const fill = useSharedValue(checked ? 1 : 0);
    const pop = useSharedValue(checked ? 1 : 0);
    const scale = useSharedValue(1);
    // 1 is the resting, finished state, so an untouched checkbox has no ring.
    const ripple = useSharedValue(1);

    React.useEffect(() => {
      fill.value = withSpring(checked ? 1 : 0, {
        damping: 15,
        stiffness: 260,
        overshootClamping: true,
      });
      pop.value = withSpring(checked ? 1 : 0, {
        damping: 11,
        stiffness: 300,
      });
    }, [checked, fill, pop]);

    const handlePress = () => {
      if (disabled || !onCheckedChange) {
        return;
      }

      scale.value = withSequence(
        withTiming(0.85, { duration: 90 }),
        withSpring(1, { damping: 9, stiffness: 320 }),
      );

      if (!checked) {
        ripple.value = 0;
        ripple.value = withTiming(1, {
          duration: 550,
          easing: Easing.out(Easing.quad),
        });
      }

      onCheckedChange(!checked);
    };

    const boxStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const fillStyle = useAnimatedStyle(() => ({
      opacity: fill.value,
      transform: [{ scale: fill.value }],
    }));

    const popStyle = useAnimatedStyle(() => ({
      opacity: Math.max(0, pop.value),
      transform: [{ scale: Math.max(0, pop.value) }],
    }));

    const rippleStyle = useAnimatedStyle(() => ({
      opacity: (1 - ripple.value) * 0.5,
      transform: [{ scale: 1 + ripple.value * 1.1 }],
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
          style={boxStyle}
          className={cn(
            "border-primary h-6 w-6 shrink-0 rounded-full border shadow",
            className,
          )}
        >
          <Animated.View
            style={fillStyle}
            className="bg-primary absolute inset-0 rounded-full"
          />
          <Animated.View
            style={popStyle}
            className="flex-1 items-center justify-center"
          >
            <Icon name="check" size={16} color="primary-foreground" />
          </Animated.View>
        </Animated.View>
      </Pressable>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
