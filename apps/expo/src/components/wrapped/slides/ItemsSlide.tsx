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

interface ItemsSlideProps {
  summary: UserWrappedSummary;
}

export function ItemsSlide({ summary }: ItemsSlideProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>ITEMS</Text>
        <Text style={styles.title}>You got things done</Text>
        <Text style={styles.subtitle}>Tick, tick, done.</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsContainer}>
        <View style={styles.row}>
          <ItemStatCard
            label="Created"
            value={summary.itemsCreated}
            index={0}
            color="#67e8f9" // cyan-300 pastel
          />
          <ItemStatCard
            label="Completed"
            value={summary.itemsCompleted}
            index={1}
            color="#86efac" // green-300 pastel
          />
        </View>

        <ItemStatCard
          label="Completion rate"
          value={
            summary.completionRate != null
              ? Math.round(summary.completionRate * 100)
              : 0
          }
          suffix="%"
          index={2}
          color="#93c5fd" // blue-300 pastel
          fullWidth
        />

        <ItemStatCard
          label="Most productive day"
          customValue={
            summary.mostProductiveDay
              ? new Date(summary.mostProductiveDay).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  },
                )
              : "–"
          }
          index={3}
          color="#d8b4fe" // purple-300 pastel
          fullWidth
        />
      </View>
    </View>
  );
}

interface ItemStatCardProps {
  label: string;
  value?: number;
  customValue?: string;
  suffix?: string;
  index: number;
  color: string;
  fullWidth?: boolean;
}

function ItemStatCard({
  label,
  value,
  customValue,
  suffix = "",
  index,
  color,
  fullWidth,
}: ItemStatCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    const delay = index * 120;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
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
        fullWidth ? undefined : styles.halfWidth,
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      {customValue ? (
        <Text style={[styles.customValue, { color }]}>{customValue}</Text>
      ) : (
        <View style={styles.valueRow}>
          <AnimatedCounter
            value={value ?? 0}
            delay={index * 120 + 200}
            style={[styles.statValue, { color }]}
          />
          {suffix && (
            <Text style={[styles.statSuffix, { color }]}>{suffix}</Text>
          )}
        </View>
      )}
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
    color: "#67e8f9", // cyan-300 pastel
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
  row: {
    flexDirection: "row",
    gap: 16,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
  },
  halfWidth: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
  },
  valueRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "700",
  },
  statSuffix: {
    marginLeft: 2,
    fontSize: 20,
    fontWeight: "600",
  },
  customValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "700",
  },
});
