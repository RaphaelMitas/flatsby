import type { ViewStyle } from "react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslations } from "use-intl";

const SNORE_SIZES = ["text-xs", "text-sm", "text-base"];

export function Snores({
  className,
  style,
  drift = "left",
}: {
  className?: string;
  style?: ViewStyle;
  drift?: "left" | "right";
}) {
  return (
    <View pointerEvents="none" style={style} className={className}>
      {[0, 1, 2].map((index) => (
        <Snore key={index} index={index} sign={drift === "left" ? -1 : 1} />
      ))}
    </View>
  );
}

function Snore({ index, sign }: { index: number; sign: number }) {
  const t = useTranslations("home.new.cat");
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        index * 1200,
        withRepeat(withTiming(1, { duration: 3600 }), -1),
      ),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.2, 1], [0, 1, 0]),
    transform: [
      { translateX: sign * 16 * progress.get() },
      { translateY: -30 * progress.get() },
    ],
  }));

  return (
    <Animated.View style={style} className="absolute">
      <Text className={`text-foreground font-extrabold ${SNORE_SIZES[index]}`}>
        {t("snore")}
      </Text>
    </Animated.View>
  );
}
