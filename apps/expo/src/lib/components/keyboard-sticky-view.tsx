import type { ReactNode } from "react";
import { Platform } from "react-native";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppKeyboardStickyViewProps {
  includeTabBar?: boolean;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}

export function AppKeyboardStickyView({
  children,
  className,
  disabled = false,
}: AppKeyboardStickyViewProps) {
  const tabBarHeight = useBottomTabBarHeight();
  const safeAreaInsets = useSafeAreaInsets();
  const { height, progress } = useReanimatedKeyboardAnimation();

  const keyboardOffset =
    Platform.OS === "ios" && !Platform.isPad ? tabBarHeight : 0;

  const openedOffset = disabled
    ? (tabBarHeight + safeAreaInsets.bottom) * 2
    : keyboardOffset;

  const animatedStyle = useAnimatedStyle(() => {
    const offset = interpolate(progress.value, [0, 1], [0, openedOffset]);

    return {
      transform: [{ translateY: height.value + offset }],
    };
  });

  return (
    <Animated.View className={className} style={animatedStyle}>
      {children}
    </Animated.View>
  );
}
