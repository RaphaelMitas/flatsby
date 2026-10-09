import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Path, Svg } from "react-native-svg";

import { useThemeColors } from "~/lib/utils";

const BAT =
  "M0 6C3 2 6 2 8 5c1-2 2-2 3 0 2-3 5-3 8 1-3-1-5 1-6 3-1-2-2-1-3.5 1C8 8 7 7 6 9 5 7 3 5 0 6Z";

const FLIGHTS = [
  { dx: -100, dy: -20, delay: 0 },
  { dx: -28, dy: -56, delay: 60 },
  { dx: 48, dy: -28, delay: 120 },
];

function Bat({
  dx,
  dy,
  delay,
  color,
}: (typeof FLIGHTS)[number] & { color: string }) {
  const progress = useSharedValue(0);
  const flap = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
    );
    flap.value = withRepeat(withTiming(0.4, { duration: 90 }), -1, true);
    return () => cancelAnimation(flap);
  }, [delay, progress, flap]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: 0.4 + 0.6 * progress.value },
      { scaleY: flap.value },
    ],
  }));

  return (
    <Animated.View style={[{ left: -14, top: -8 }, style]} className="absolute">
      <Svg viewBox="0 0 19 11" width={28} height={16}>
        <Path d={BAT} fill={color} />
      </Svg>
    </Animated.View>
  );
}

export function Bats() {
  const { getColor } = useThemeColors();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none">
      {FLIGHTS.map((flight) => (
        <Bat key={flight.dx} {...flight} color={getColor("foreground")} />
      ))}
    </View>
  );
}
