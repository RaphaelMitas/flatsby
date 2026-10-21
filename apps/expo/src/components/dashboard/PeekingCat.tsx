import { useCallback } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { useFocusEffect, useIsFocused } from "expo-router";
import { useTranslations } from "use-intl";

import FlatsbyCat from "~/lib/ui/custom/icons/FlatsbyCat";
import { useThemeColors } from "~/lib/utils";
import { CAT_SIZE, CatTapReaction, HOP, useCatTap } from "./useCatTap";

const PEEK = 30;

export function PeekingCat() {
  const t = useTranslations("home");
  const { getColor } = useThemeColors();
  const isFocused = useIsFocused();
  const rise = useSharedValue(PEEK);
  const { hop, taps, tap } = useCatTap();

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

  return (
    <View>
      <View style={{ height: PEEK + HOP }} className="overflow-hidden">
        <Pressable onPress={tap} accessibilityLabel={t("catLabel")}>
          <Animated.View style={[{ marginTop: HOP }, catStyle]}>
            <FlatsbyCat
              size={CAT_SIZE}
              color={getColor("primary")}
              animated={isFocused}
            />
          </Animated.View>
        </Pressable>
      </View>
      <CatTapReaction taps={taps} />
    </View>
  );
}
