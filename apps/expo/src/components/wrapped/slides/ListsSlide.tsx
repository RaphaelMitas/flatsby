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

import { AnimatedCounter } from "../AnimatedCounter";

interface ListsSlideProps {
  summary: UserWrappedSummary;
}

export function ListsSlide({ summary }: ListsSlideProps) {
  const circleScale = useSharedValue(0);
  const circleOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    circleOpacity.value = withTiming(1, { duration: 500 });
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    cardTranslateY.value = withDelay(400, withSpring(0, { damping: 15 }));
  }, [circleScale, circleOpacity, cardOpacity, cardTranslateY]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>LISTS</Text>
        <Text style={styles.title}>Lists you lived in</Text>
        <Text style={styles.subtitle}>Your shopping hubs.</Text>
      </View>

      {/* Lists count circle */}
      <View style={styles.circleContainer}>
        <Animated.View style={[circleStyle, styles.circle]}>
          <AnimatedCounter
            value={summary.listsTouched}
            delay={200}
            style={styles.circleValue}
          />
        </Animated.View>
        <Text style={styles.circleLabel}>lists touched</Text>
      </View>

      {/* Most used list card */}
      {summary.mostUsedList ? (
        <Animated.View style={[cardStyle, styles.card]}>
          <Text style={styles.cardLabel}>MOST USED LIST</Text>
          <Text style={styles.cardTitle}>{summary.mostUsedList.name}</Text>
          <Text style={styles.cardSubtitle}>
            {summary.mostUsedList.actions} actions on this list
          </Text>
        </Animated.View>
      ) : (
        <Animated.View style={[cardStyle, styles.emptyCard]}>
          <Text style={styles.emptyText}>
            Create a list to kick off{"\n"}your next run.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 2,
    color: "#fdba74", // orange-300 pastel
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "700",
    color: "white",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  circleContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  circle: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: "rgba(253, 186, 116, 0.25)", // orange-300 pastel
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fdba74", // orange-300 pastel
  },
  circleLabel: {
    marginTop: 16,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(253, 186, 116, 0.4)", // orange-300 pastel
    backgroundColor: "rgba(253, 186, 116, 0.15)", // orange-300 pastel
    padding: 24,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2,
    color: "rgba(253, 186, 116, 0.8)", // orange-300 pastel
  },
  cardTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  cardSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
  },
  emptyCard: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
});
