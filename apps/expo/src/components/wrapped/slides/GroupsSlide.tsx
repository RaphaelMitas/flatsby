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

interface GroupsSlideProps {
  summary: UserWrappedSummary;
}

export function GroupsSlide({ summary }: GroupsSlideProps) {
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
        <Text style={styles.label}>GROUPS</Text>
        <Text style={styles.title}>Your crews</Text>
        <Text style={styles.subtitle}>Shopping together hits different.</Text>
      </View>

      {/* Groups count circle */}
      <View style={styles.circleContainer}>
        <Animated.View style={[circleStyle, styles.circle]}>
          <AnimatedCounter
            value={summary.groupsJoined}
            delay={200}
            style={styles.circleValue}
          />
        </Animated.View>
        <Text style={styles.circleLabel}>groups joined</Text>
      </View>

      {/* Top group card */}
      {summary.topGroupByActivity ? (
        <Animated.View style={[cardStyle, styles.card]}>
          <Text style={styles.cardLabel}>MOST ACTIVE GROUP</Text>
          <Text style={styles.cardTitle}>
            {summary.topGroupByActivity.name}
          </Text>
          <Text style={styles.cardSubtitle}>
            {summary.topGroupByActivity.actions} item updates together
          </Text>
        </Animated.View>
      ) : (
        <Animated.View style={[cardStyle, styles.emptyCard]}>
          <Text style={styles.emptyText}>
            Join a group to start your{"\n"}shared shopping story.
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
    color: "#86efac", // green-300 pastel
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
    backgroundColor: "rgba(134, 239, 172, 0.25)", // green-300 pastel
    alignItems: "center",
    justifyContent: "center",
  },
  circleValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#86efac", // green-300 pastel
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
    borderColor: "rgba(134, 239, 172, 0.4)", // green-300 pastel
    backgroundColor: "rgba(134, 239, 172, 0.15)", // green-300 pastel
    padding: 24,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 2,
    color: "rgba(134, 239, 172, 0.8)", // green-300 pastel
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
