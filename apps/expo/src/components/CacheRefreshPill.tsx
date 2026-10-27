import type { Query } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";

const launchedAt = Date.now();

const isRestored = (query: Query) =>
  query.state.dataUpdatedAt > 0 && query.state.dataUpdatedAt < launchedAt;

// A failed refetch keeps its old dataUpdatedAt, so it would show the pill on every focus
const failedRefresh = (query: Query) =>
  isRestored(query) && query.state.errorUpdatedAt >= launchedAt;

export function CacheRefreshPill() {
  const t = useTranslations("common");
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const refreshing =
    useIsFetching({
      predicate: (query) => isRestored(query) && !failedRefresh(query),
    }) > 0;
  const [wasRefreshing, setWasRefreshing] = useState(refreshing);
  const [showUpToDate, setShowUpToDate] = useState(false);

  if (refreshing !== wasRefreshing) {
    setWasRefreshing(refreshing);
    if (!refreshing) {
      setShowUpToDate(
        !queryClient.getQueryCache().getAll().some(failedRefresh),
      );
    }
  }

  useEffect(() => {
    if (!showUpToDate) return;
    const timeout = setTimeout(() => setShowUpToDate(false), 1000);
    return () => clearTimeout(timeout);
  }, [showUpToDate]);

  if (!refreshing && !showUpToDate) return null;

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      pointerEvents="none"
      style={{ top: insets.top + 8 }}
      className="bg-card border-border absolute flex-row items-center gap-2 self-center rounded-full border px-3.5 py-2 shadow-md"
    >
      {refreshing ? (
        <ActivityIndicator size="small" />
      ) : (
        <Icon name="check" size={14} color="success" />
      )}
      <Text className="text-foreground text-sm font-semibold">
        {refreshing ? t("updating") : t("upToDate")}
      </Text>
    </Animated.View>
  );
}
