import type { Query } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import Icon from "~/lib/ui/custom/icons/Icon";

// Data from before this launch can only have come from the persisted cache
const launchedAt = Date.now();

const isRestored = (query: Query) =>
  query.state.dataUpdatedAt > 0 && query.state.dataUpdatedAt < launchedAt;

// Once a refetch failed, later focus refetches of that query stay silent
const isRefreshable = (query: Query) =>
  isRestored(query) && query.state.status === "success";

export function CacheRefreshPill() {
  const t = useTranslations("common");
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const refreshing = useIsFetching({ predicate: isRefreshable }) > 0;
  const [wasRefreshing, setWasRefreshing] = useState(refreshing);
  const [done, setDone] = useState(false);

  if (refreshing !== wasRefreshing) {
    setWasRefreshing(refreshing);
    // A failed refetch keeps its old data, which is not up to date
    if (!refreshing) {
      setDone(
        !queryClient
          .getQueryCache()
          .getAll()
          .some((query) => isRestored(query) && query.state.status === "error"),
      );
    }
  }

  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => setDone(false), 1000);
    return () => clearTimeout(timeout);
  }, [done]);

  if (!refreshing && !done) return null;

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
