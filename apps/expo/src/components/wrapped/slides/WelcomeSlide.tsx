import type { UserWrappedSummary } from "@flatsby/api";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface WelcomeSlideProps {
  summary: UserWrappedSummary;
}

export function WelcomeSlide({ summary }: WelcomeSlideProps) {
  const yearScale = useSharedValue(0);
  const yearOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const dateOpacity = useSharedValue(0);

  useEffect(() => {
    yearScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    yearOpacity.value = withTiming(1, { duration: 600 });
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    subtitleTranslateY.value = withDelay(
      400,
      withSpring(0, { damping: 15, stiffness: 100 }),
    );
    dateOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
  }, [
    yearScale,
    yearOpacity,
    subtitleOpacity,
    subtitleTranslateY,
    dateOpacity,
  ]);

  const yearStyle = useAnimatedStyle(() => ({
    transform: [{ scale: yearScale.value }],
    opacity: yearOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const dateStyle = useAnimatedStyle(() => ({
    opacity: dateOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Year */}
      <Animated.View style={yearStyle}>
        <Text style={styles.yearText}>{summary.year}</Text>
      </Animated.View>

      {/* Greeting */}
      <Animated.View style={[subtitleStyle, styles.subtitleContainer]}>
        <Text style={styles.subtitleText}>
          {summary.userName
            ? `Nice work this year, ${summary.userName}!`
            : "Nice work this year!"}
        </Text>
      </Animated.View>

      {/* Date range */}
      <Animated.View style={[dateStyle, styles.dateContainer]}>
        <Text style={styles.dateText}>
          From {new Date(summary.from).toLocaleDateString()} to{" "}
          {new Date(summary.to).toLocaleDateString()}
        </Text>
        <Text style={[styles.dateText, styles.dateTextMargin]}>
          You collaborated in groups, created shopping lists{"\n"}
          and got things done together.
        </Text>
      </Animated.View>

      {/* Decorative elements */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    textAlign: "center",
    fontSize: 96,
    fontWeight: "900",
    letterSpacing: -4,
    color: "white",
  },
  subtitleContainer: {
    marginTop: 24,
  },
  subtitleText: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  dateContainer: {
    marginTop: 32,
  },
  dateText: {
    textAlign: "center",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
  dateTextMargin: {
    marginTop: 8,
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 9999,
  },
  decorCircle1: {
    top: 80,
    left: -40,
    width: 160,
    height: 160,
    backgroundColor: "rgba(100, 255, 255, 0.5)",
  },
  decorCircle2: {
    right: -40,
    bottom: 160,
    width: 240,
    height: 240,
    backgroundColor: "rgba(100, 180, 100, 0.5)",
  },
});
