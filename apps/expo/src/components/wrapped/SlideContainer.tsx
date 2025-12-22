import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import { Dimensions, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SlideContainerProps {
  children: ReactNode;
  index: number;
  currentIndex: SharedValue<number>;
}

export function SlideContainer({
  children,
  index,
  currentIndex,
}: SlideContainerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(currentIndex.value - index);

    return {
      opacity: interpolate(distance, [0, 0.5, 1], [1, 0.7, 0.5]),
      transform: [
        {
          scale: interpolate(distance, [0, 1], [1, 0.9]),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: SCREEN_WIDTH,
          flex: 1,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 64,
          paddingBottom: 80,
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}
