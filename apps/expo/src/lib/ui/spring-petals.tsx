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

import { useSpringEffects } from "./spring-effects";

const PETAL_COLORS = ["#FFB7C5", "#FFC0CB", "#FF69B4", "#FADADD", "#FFD1DC"];

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  drift: number;
  color: string;
}

function generatePetals(): Petal[] {
  const petals: Petal[] = [];
  const count = 25;

  for (let i = 0; i < count; i++) {
    petals.push({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 8, // 8-16px
      duration: Math.random() * 10000 + 10000, // 10-20s
      delay: Math.random() * 3000,
      opacity: Math.random() * 0.45 + 0.4, // 0.4-0.85
      drift: (Math.random() - 0.5) * 60, // ±30px
      color:
        PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)] ??
        "#FFB7C5",
    });
  }

  return petals;
}

export function SpringPetals() {
  const { isEnabled } = useSpringEffects();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [petals] = useState<Petal[]>(() => generatePetals());

  if (!isEnabled || petals.length === 0 || screenHeight === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { width: screenWidth, height: screenHeight }]}
      pointerEvents="none"
    >
      {petals.map((petal) => (
        <PetalComponent
          key={petal.id}
          petal={petal}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
        />
      ))}
    </View>
  );
}

interface PetalComponentProps {
  petal: Petal;
  screenWidth: number;
  screenHeight: number;
}

function PetalComponent({
  petal,
  screenWidth,
  screenHeight,
}: PetalComponentProps) {
  const translateY = useSharedValue(-petal.size);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (screenHeight === 0) return;

    const timeout = setTimeout(() => {
      const travelDistance = screenHeight + petal.size * 2;
      const startY = -petal.size;

      translateY.value = startY;

      translateY.value = withRepeat(
        withSequence(
          withTiming(travelDistance, {
            duration: petal.duration,
            easing: Easing.linear,
          }),
          withTiming(startY, {
            duration: 0,
          }),
        ),
        -1,
        false,
      );

      translateX.value = withRepeat(
        withTiming(petal.drift, {
          duration: petal.duration / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );

      rotation.value = withRepeat(
        withTiming(360, {
          duration: petal.duration * 0.8,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }, petal.delay);

    return () => clearTimeout(timeout);
  }, [
    petal.duration,
    petal.delay,
    petal.drift,
    petal.size,
    screenHeight,
    translateY,
    translateX,
    rotation,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          left: (screenWidth * petal.left) / 100,
          top: 0,
          width: petal.size * 0.6,
          height: petal.size,
          opacity: petal.opacity,
          backgroundColor: petal.color,
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
    zIndex: 0,
    elevation: 0,
  },
  petal: {
    position: "absolute",
    borderTopLeftRadius: 50,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 50,
  },
});
