import type { SharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Line, Path, Svg } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import type { RefreshSceneProps } from "../season";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";

const SKY = ["#2e1a4f", "#4a2468", "#6b3a6e"] as const;
const ROOFTOPS = "M0 14V6h10V1h8v6h12l6-7 6 7h13V3h11v5h12l6-6 6 6h10v6Z";
const STARS = [
  { left: "6%", top: 8 },
  { left: "22%", top: 22 },
  { left: "41%", top: 6 },
  { left: "58%", top: 18 },
  { left: "70%", top: 30 },
] as const;

const RIDER_WIDTH = 64;
const PARKED_X = 16;
const LAP_MS = 1600;

function Star({
  twinkle,
  index,
  ...position
}: (typeof STARS)[number] & { twinkle: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * (index % 2 ? twinkle.value : 1 - twinkle.value),
  }));

  return (
    <Animated.View
      style={[position, style]}
      className="absolute h-[3px] w-[3px] rounded-full bg-white"
    />
  );
}

function BroomRider({ refreshing }: { refreshing: boolean }) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(PARKED_X);

  useEffect(() => {
    if (!refreshing || reduceMotion) {
      cancelAnimation(x);
      x.value = PARKED_X;
      return;
    }
    const exit = width + 20;
    const easing = Easing.inOut(Easing.sin);
    x.value = withSequence(
      withTiming(exit, { duration: LAP_MS, easing }),
      withRepeat(
        withSequence(
          withTiming(-RIDER_WIDTH, { duration: 0 }),
          withTiming(exit, { duration: LAP_MS, easing }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(x);
  }, [refreshing, reduceMotion, width, x]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: Math.sin(x.value / 40) * 3 },
    ],
  }));

  return (
    <Animated.View
      style={[{ width: RIDER_WIDTH }, style]}
      className="absolute top-2"
    >
      <View className="ml-5">
        <FlatsbyCat size={28} color="#0a0a0b" detail="#fb923c" animated />
      </View>
      <Svg
        viewBox="0 0 90 20"
        width={RIDER_WIDTH}
        height={14}
        style={{ marginTop: -8 }}
      >
        <Line
          x1={26}
          y1={8}
          x2={86}
          y2={8}
          stroke="#a16207"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path d="M28 4 L2 0 L0 16 L28 12 Z" fill="#ca8a04" />
      </Svg>
    </Animated.View>
  );
}

export function NightSkyScene({ refreshing }: RefreshSceneProps) {
  const reduceMotion = useReducedMotion();
  const twinkle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    twinkle.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true);
    return () => cancelAnimation(twinkle);
  }, [reduceMotion, twinkle]);

  return (
    <View className="absolute inset-0">
      <LinearGradient colors={SKY} style={{ position: "absolute", inset: 0 }} />
      <View
        className="absolute top-3 right-6 h-7 w-7 rounded-full"
        style={{ backgroundColor: "#fdf0c2", boxShadow: "0 0 24px #fdf0c2aa" }}
      />
      {STARS.map((star, index) => (
        <Star key={star.left} {...star} index={index} twinkle={twinkle} />
      ))}
      <BroomRider refreshing={refreshing} />
      <Svg
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        width="100%"
        height={14}
        style={{ position: "absolute", bottom: 0 }}
      >
        <Path d={ROOFTOPS} fill="#140a22" />
      </Svg>
    </View>
  );
}
