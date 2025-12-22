import type { TextStyle } from "react-native";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

interface AnimatedCounterProps {
  value: number;
  delay?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: TextStyle | TextStyle[];
}

export function AnimatedCounter({
  value,
  delay = 0,
  duration = 1000,
  suffix = "",
  prefix = "",
  style,
}: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.value = withDelay(delay, withTiming(value, { duration }));
  }, [value, delay, duration, animatedValue]);

  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayValue)(current);
      }
    },
    [animatedValue],
  );

  return (
    <Text style={style}>
      {prefix}
      {displayValue}
      {suffix}
    </Text>
  );
}
