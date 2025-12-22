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

interface EngagementSlideProps {
  summary: UserWrappedSummary;
}

export function EngagementSlide({ summary }: EngagementSlideProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>ENGAGEMENT</Text>
        <Text style={styles.title}>You kept showing up</Text>
        <Text style={styles.subtitle}>Consistency is key.</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsContainer}>
        <StatCard
          label="Sessions"
          value={summary.totalSessions}
          index={0}
          color="#d8b4fe" // purple-300 pastel
        />
        <StatCard
          label="Active days"
          value={summary.activeDays}
          index={1}
          color="#f9a8d4" // pink-300 pastel
        />
        <StatCard
          label="Longest streak"
          value={summary.longestStreak}
          suffix=" days"
          index={2}
          color="#fca5a5" // red-300 pastel
        />
      </View>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  index: number;
  color: string;
}

function StatCard({ label, value, suffix = "", index, color }: StatCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    const delay = index * 150;
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
  }, [opacity, translateY, scale, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        styles.statCard,
        { backgroundColor: `${color}33` },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <AnimatedCounter
          value={value}
          delay={index * 150 + 300}
          style={[styles.statValue, { color }]}
        />
        {suffix && <Text style={[styles.statSuffix, { color }]}>{suffix}</Text>}
      </View>
    </Animated.View>
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
    color: "#d8b4fe", // purple-300 pastel
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
  statsContainer: {
    flex: 1,
    gap: 16,
  },
  statCard: {
    borderRadius: 16,
    padding: 24,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
  },
  statValueRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  statSuffix: {
    marginLeft: 4,
    fontSize: 24,
    fontWeight: "600",
  },
});
