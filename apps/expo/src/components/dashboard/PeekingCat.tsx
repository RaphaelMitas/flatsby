import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";

import { season } from "~/lib/seasonal/season";
import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import { useThemeColors } from "~/lib/utils";

const CAT_SIZE = 56;
const PEEK = 30;
const HOP = 8;

export function PeekingCat() {
  const { getColor } = useThemeColors();
  const rise = useSharedValue(PEEK);
  const hop = useSharedValue(0);
  const [taps, setTaps] = useState(0);
  const TapReaction = season.TapReaction;

  useFocusEffect(
    useCallback(() => {
      rise.value = withDelay(300, withSpring(0, { damping: 14 }));
      return () => {
        rise.value = PEEK;
      };
    }, [rise]),
  );

  const catStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value + hop.value }],
  }));

  const handlePress = () => {
    hop.value = withSequence(
      withTiming(-HOP, { duration: 120 }),
      withSpring(0, { damping: 8, stiffness: 300 }),
    );
    setTaps((n) => n + 1);
  };

  return (
    <View>
      <View style={{ height: PEEK + HOP }} className="overflow-hidden">
        <Pressable onPress={handlePress} accessibilityLabel="Flatsby cat">
          <Animated.View style={[{ marginTop: HOP }, catStyle]}>
            <FlatsbyCat size={CAT_SIZE} color={getColor("primary")} animated />
          </Animated.View>
        </Pressable>
      </View>
      {TapReaction && taps > 0 && (
        <View pointerEvents="none" className="absolute top-5 left-1/2">
          <TapReaction key={taps} />
        </View>
      )}
    </View>
  );
}
