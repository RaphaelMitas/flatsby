import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useThemeColors } from "../utils";
import { useWinterEffects } from "./winter-effects";

interface Snowflake {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number; // Horizontal drift amount
}

/**
 * Snow effect component for React Native (Expo)
 * Renders animated snowflakes falling in the background
 */
// Generate snowflakes function
function generateSnowflakes(): Snowflake[] {
  const flakes: Snowflake[] = [];
  const count = 30; // Reduced count for subtler effect

  for (let i = 0; i < count; i++) {
    flakes.push({
      id: i,
      left: Math.random() * 100, // Random horizontal position (0-100%)
      size: Math.random() * 4 + 4, // Size between 3-5px (slightly bigger)
      duration: Math.random() * 8000 + 8000, // Fall duration 8-16s (in ms)
      delay: Math.random() * 2000, // Initial delay 0-2s
      opacity: Math.random() * 0.3 + 0.4, // Opacity 0.4-0.7 (more subtle)
      drift: (Math.random() - 0.5) * 30, // Horizontal drift -15 to +15px
    });
  }

  return flakes;
}

export function WinterSnow() {
  const { isEnabled } = useWinterEffects();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [snowflakes] = useState<Snowflake[]>(() => generateSnowflakes());
  const { getColor } = useThemeColors();

  // Don't render if dimensions not ready
  if (!isEnabled || snowflakes.length === 0 || screenHeight === 0) {
    return null;
  }

  // Determine snowflake color based on theme
  const snowflakeColor = getColor("muted-foreground");

  return (
    <View
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      pointerEvents="none"
    >
      {snowflakes.map((flake) => (
        <SnowflakeComponent
          key={flake.id}
          flake={flake}
          color={snowflakeColor}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
}

interface SnowflakeComponentProps {
  flake: Snowflake;
  color: string;
  screenWidth: number;
  screenHeight: number;
}

function SnowflakeComponent({
  flake,
  color,
  screenWidth,
  screenHeight,
}: SnowflakeComponentProps) {
  const translateY = useSharedValue(-flake.size);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (screenHeight === 0) return; // Wait for dimensions

    // Start animation after delay
    const timeout = setTimeout(() => {
      // Calculate the distance to travel (from above screen to below screen)
      const travelDistance = screenHeight + flake.size * 2;
      const startY = -flake.size;

      // Start from above screen
      translateY.value = startY;

      // Animate falling down, then instantly reset to top and repeat
      translateY.value = withRepeat(
        withSequence(
          withTiming(travelDistance, {
            duration: flake.duration,
            easing: Easing.linear,
          }),
          withTiming(startY, {
            duration: 0, // Instant reset
          }),
        ),
        -1, // Infinite repeat
        false,
      );

      // Horizontal drift animation
      translateX.value = withRepeat(
        withTiming(flake.drift, {
          duration: flake.duration / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true, // Reverse on repeat for back-and-forth motion
      );
    }, flake.delay);

    return () => clearTimeout(timeout);
  }, [
    flake.duration,
    flake.delay,
    flake.drift,
    flake.size,
    screenHeight,
    translateY,
    translateX,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.snowflake,
        {
          left: (screenWidth * flake.left) / 100, // Convert percentage to pixels
          top: 0,
          width: flake.size,
          height: flake.size,
          opacity: flake.opacity,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Behind content
    elevation: 0, // Android z-index (behind content)
  },
  snowflake: {
    position: "absolute",
    borderRadius: 9999, // Fully rounded
  },
});
