import type { SharedValue } from "react-native-reanimated";
import { Pressable, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from "react-native-reanimated";

interface ProgressDotsProps {
  total: number;
  currentIndex: SharedValue<number>;
  onDotPress: (index: number) => void;
}

export function ProgressDots({
  total,
  currentIndex,
  onDotPress,
}: ProgressDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <Dot
          key={index}
          index={index}
          currentIndex={currentIndex}
          onPress={() => onDotPress(index)}
        />
      ))}
    </View>
  );
}

interface DotProps {
  index: number;
  currentIndex: SharedValue<number>;
  onPress: () => void;
}

function Dot({ index, currentIndex, onPress }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(currentIndex.value - index);

    return {
      width: interpolate(distance, [0, 1], [24, 8]),
      backgroundColor: interpolateColor(
        distance,
        [0, 1],
        ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0.3)"],
      ),
    };
  });

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View
        style={[
          {
            height: 8,
            borderRadius: 4,
          },
          animatedStyle,
        ]}
      />
    </Pressable>
  );
}
