import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useIsFocused } from "expo-router";
import { useTranslations } from "use-intl";

import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import { useThemeColors } from "~/lib/utils";
import { CAT_SIZE, CatTapReaction, useCatTap } from "../dashboard/useCatTap";
import { Snores } from "./Snores";

export type CatPose = "sitting" | "peeking" | "asleep";

const SINK_BELOW_CARD: Record<CatPose, number> = {
  sitting: 10,
  peeking: 20,
  asleep: 24,
};

export function HomeCat({
  pose,
  stretchKey,
  onPress,
}: {
  pose: CatPose;
  stretchKey: number;
  onPress: () => void;
}) {
  const t = useTranslations("home");
  const { getColor } = useThemeColors();
  const isFocused = useIsFocused();
  const sink = useSharedValue(CAT_SIZE);
  const { hop, taps, tap } = useCatTap();
  const stretch = useSharedValue(0);

  useEffect(() => {
    sink.value = isFocused
      ? withSpring(SINK_BELOW_CARD[pose], { damping: 14 })
      : CAT_SIZE;
  }, [isFocused, pose, sink]);

  useEffect(() => {
    if (stretchKey === 0) return;
    stretch.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(-0.4, { duration: 220 }),
      withSpring(0, { damping: 10 }),
    );
  }, [stretchKey, stretch]);

  const catStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: sink.value + hop.value - stretch.value * 9 },
      { scaleX: 1 - stretch.value * 0.08 },
      { scaleY: 1 + stretch.value * 0.16 },
    ],
  }));

  const handlePress = () => {
    tap();
    onPress();
  };

  return (
    <Pressable
      testID="home-cat"
      onPress={handlePress}
      accessibilityLabel={t("catLabel")}
      className="absolute top-0 right-4"
    >
      <Animated.View style={catStyle}>
        <FlatsbyCat
          size={CAT_SIZE}
          color={getColor("primary")}
          animated={isFocused}
          asleep={pose === "asleep"}
        />
      </Animated.View>
      <CatTapReaction taps={taps} />
    </Pressable>
  );
}

export function CatOverlay({
  pose,
  speech,
}: {
  pose: CatPose;
  speech: string | null;
}) {
  return (
    <>
      {pose === "sitting" && (
        <Animated.View
          entering={ZoomIn.delay(500)}
          exiting={FadeOut}
          pointerEvents="none"
          style={{ top: CAT_SIZE - 6, width: CAT_SIZE }}
          className="absolute right-4 flex-row justify-center gap-1"
        >
          <View className="bg-primary border-card h-2.5 w-3.5 rounded-full border" />
          <View className="bg-primary border-card h-2.5 w-3.5 rounded-full border" />
        </Animated.View>
      )}
      {pose === "asleep" && (
        <Snores style={{ top: CAT_SIZE - 20 }} className="absolute right-20" />
      )}
      {speech && <CatBubble key={speech} text={speech} />}
    </>
  );
}

function CatBubble({ text }: { text: string }) {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      className="bg-primary absolute top-6 right-28 rounded-2xl rounded-br-sm px-3 py-1.5"
    >
      <Text className="text-primary-foreground text-xs font-semibold">
        {text}
      </Text>
    </Animated.View>
  );
}
