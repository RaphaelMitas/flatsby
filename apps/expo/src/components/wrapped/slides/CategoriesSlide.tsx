import type { UserWrappedSummary } from "@flatsby/api";
import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { getCategoryData } from "~/components/shoppingList/ShoppingListCategory";

// Map Tailwind color classes to hex values for StyleSheet
const categoryColorMap: Record<string, string> = {
  "text-green-600 dark:text-green-300": "#86efac", // green-300
  "text-red-600 dark:text-red-300": "#fca5a5", // red-300
  "text-blue-600 dark:text-blue-300": "#93c5fd", // blue-300
  "text-orange-600 dark:text-orange-300": "#fdba74", // orange-300
  "text-cyan-600 dark:text-cyan-300": "#67e8f9", // cyan-300
  "text-purple-600 dark:text-purple-300": "#d8b4fe", // purple-300
  "text-yellow-600 dark:text-yellow-300": "#fde047", // yellow-300
  "text-pink-600 dark:text-pink-300": "#f9a8d4", // pink-300
  "text-gray-600 dark:text-gray-300": "#d1d5db", // gray-300
  "text-zinc-600 dark:text-zinc-300": "#d4d4d8", // zinc-300
  "text-primary": "#f43f5e", // primary color
};

interface CategoriesSlideProps {
  summary: UserWrappedSummary;
}

export function CategoriesSlide({ summary }: CategoriesSlideProps) {
  const maxCount = Math.max(...summary.topCategories.map((c) => c.count), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>CATEGORIES</Text>
        <Text style={styles.title}>Your shopping style</Text>
        <Text style={styles.subtitle}>What you really cared about.</Text>
      </View>

      {/* Categories list */}
      <View style={styles.categoriesContainer}>
        {summary.topCategories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Once you start adding items,{"\n"}we'll show your top categories
              here.
            </Text>
          </View>
        ) : (
          summary.topCategories.map((category, index) => (
            <CategoryRow
              key={category.categoryId}
              categoryId={category.categoryId}
              count={category.count}
              maxCount={maxCount}
              index={index}
            />
          ))
        )}
      </View>
    </View>
  );
}

interface CategoryRowProps {
  categoryId: string;
  count: number;
  maxCount: number;
  index: number;
}

function CategoryRow({ categoryId, count, maxCount, index }: CategoryRowProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-30);
  const barWidth = useSharedValue(0);

  const percentage = (count / maxCount) * 100;
  const categoryData = getCategoryData(
    categoryId as CategoryIdWithAiAutoSelect,
  );
  const color = categoryColorMap[categoryData.color] ?? "#f43f5e";

  useEffect(() => {
    const delay = index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateX.value = withDelay(delay, withSpring(0, { damping: 15 }));
    barWidth.value = withDelay(
      delay + 200,
      withTiming(percentage, { duration: 600 }),
    );
  }, [opacity, translateX, barWidth, index, percentage]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <Animated.View style={[rowStyle, styles.row]}>
      <View style={styles.rowHeader}>
        <View style={styles.rankContainer}>
          <View
            style={[styles.iconContainer, { backgroundColor: `${color}33` }]}
          >
            {categoryData.icon}
          </View>
          <Text style={styles.categoryName}>{categoryData.name}</Text>
        </View>
        <Text style={styles.countText}>
          {count} item{count === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <Animated.View
          style={[styles.bar, barStyle, { backgroundColor: color }]}
        />
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
    color: "#fca5a5", // red-300 pastel
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
  categoriesContainer: {
    flex: 1,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
  row: {
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
  countText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  barContainer: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
});
