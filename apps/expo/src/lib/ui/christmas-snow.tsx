import { useEffect, useState } from "react";
import {
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * Checks if the current date is in winter season (December, January, or February)
 */
function isWinterSeason(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  // December (11), January (0), February (1)
  return month === 11 || month === 0 || month === 1;
}

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
  const count = 35; // Slightly fewer for mobile performance

  for (let i = 0; i < count; i++) {
    flakes.push({
      id: i,
      left: Math.random() * 100, // Random horizontal position (0-100%)
      size: Math.random() * 6 + 4, // Size between 4-10px (larger for visibility)
      duration: Math.random() * 8000 + 8000, // Fall duration 8-16s (in ms)
      delay: Math.random() * 2000, // Initial delay 0-2s
      opacity: Math.random() * 0.4 + 0.6, // Opacity 0.6-1.0 (more visible)
      drift: (Math.random() - 0.5) * 40, // Horizontal drift -20 to +20px
    });
  }

  return flakes;
}

export function WinterSnow() {
  const isWinter = isWinterSeason();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [snowflakes] = useState<Snowflake[]>(() =>
    isWinter ? generateSnowflakes() : [],
  );
  const colorScheme = useColorScheme();

  // Don't render if not winter season or dimensions not ready
  if (!isWinter || snowflakes.length === 0 || screenHeight === 0) {
    return null;
  }

  // Determine snowflake color based on theme
  const snowflakeColor = colorScheme === "dark" ? "#ffffff" : "#e5e7eb";

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
    zIndex: -1, // Behind content
    elevation: -1, // Android z-index
  },
  snowflake: {
    position: "absolute",
    borderRadius: 9999, // Fully rounded
  },
});
