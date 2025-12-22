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

interface SummarySlideProps {
  summary: UserWrappedSummary;
}

export function SummarySlide({ summary }: SummarySlideProps) {
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    cardOpacity.value = withTiming(1, { duration: 600 });
  }, [cardScale, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>SUMMARY</Text>
        <Text style={styles.title}>Your Wrapped card</Text>
        <Text style={styles.subtitle}>Perfect for a screenshot.</Text>
      </View>

      {/* Summary card */}
      <Animated.View style={[cardStyle, styles.card]}>
        {/* Brand */}
        <Text style={styles.brand}>FLATSBY WRAPPED {summary.year}</Text>

        {/* Name */}
        <Text style={styles.name}>
          {summary.userName ?? "Your year in shared shopping"}
        </Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <SummaryItem
            value={summary.itemsCompleted}
            label="items completed"
            delay={200}
          />
          <SummaryItem
            value={summary.activeDays}
            label="active days"
            delay={400}
          />
          {summary.topCategories[0] && (
            <SummaryTextItem
              title="Top category"
              value={summary.topCategories[0].categoryId}
              delay={600}
            />
          )}
          {summary.topGroupByActivity && (
            <SummaryTextItem
              title="Top group"
              value={summary.topGroupByActivity.name}
              delay={800}
            />
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>flatsby.com</Text>
      </Animated.View>
    </View>
  );
}

interface SummaryItemProps {
  value: number;
  label: string;
  delay: number;
}

function SummaryItem({ value, label, delay }: SummaryItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, [opacity, translateY, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, styles.itemRow]}>
      <Text style={styles.itemValue}>{value}</Text>
      <Text style={styles.itemLabel}>{label}</Text>
    </Animated.View>
  );
}

interface SummaryTextItemProps {
  title: string;
  value: string;
  delay: number;
}

function SummaryTextItem({ title, value, delay }: SummaryTextItemProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15 }));
  }, [opacity, translateY, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <Text style={styles.textItemTitle}>{title}</Text>
      <Text style={styles.textItemValue}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
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
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "rgba(216, 180, 254, 0.3)", // purple-300 pastel
    padding: 24,
  },
  brand: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 3,
    color: "rgba(255,255,255,0.7)",
  },
  name: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  statsContainer: {
    marginTop: 32,
    flex: 1,
    gap: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  itemValue: {
    fontSize: 30,
    fontWeight: "700",
    color: "white",
  },
  itemLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  textItemTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  textItemValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  footer: {
    marginTop: "auto",
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
  },
});
