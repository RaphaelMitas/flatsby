import type { Query } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { inShoppingListQueue } from "@flatsby/api/shoppingListQueue";

import Icon from "~/lib/ui/custom/icons/Icon";
import { useIsOnline } from "~/utils/live-query";

const launchedAt = Date.now();
const DISMISS_DISTANCE = 16;
const FLING_VELOCITY = 500;

const isRestored = (query: Query) =>
  query.state.dataUpdatedAt > 0 && query.state.dataUpdatedAt < launchedAt;

// A failed refetch keeps its old dataUpdatedAt, so it would show the pill on every focus
const failedRefresh = (query: Query) =>
  isRestored(query) && query.state.errorUpdatedAt >= launchedAt;

export function CacheRefreshPill() {
  const t = useTranslations("common");
  const queryClient = useQueryClient();
  const online = useIsOnline();
  const queued = useIsMutating({ predicate: inShoppingListQueue });
  const restoring =
    useIsFetching({
      predicate: (query) => isRestored(query) && !failedRefresh(query),
    }) > 0;
  const [wasOnline, setWasOnline] = useState(online);
  const [replaying, setReplaying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const refreshing = restoring || replaying;
  const [wasRefreshing, setWasRefreshing] = useState(refreshing);
  const [showUpToDate, setShowUpToDate] = useState(false);

  if (online !== wasOnline) {
    setWasOnline(online);
    // A dismissed pill comes back the next time the network drops
    setDismissed(false);
    setReplaying(online && queued > 0);
  }
  if (replaying && queued === 0) setReplaying(false);

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

  if (!online) {
    if (dismissed) return null;
    return (
      <Pill onDismiss={() => setDismissed(true)}>
        <Icon name="cloud-off" size={14} color="muted-foreground" />
        <Text className="text-foreground text-sm font-semibold">
          {t("offline", { count: queued })}
        </Text>
      </Pill>
    );
  }

  if (!refreshing && !showUpToDate) return null;

  return (
    <Pill>
      {refreshing ? (
        <ActivityIndicator size="small" />
      ) : (
        <Icon name="check" size={14} color="success" />
      )}
      <Text className="text-foreground text-sm font-semibold">
        {refreshing ? t("updating") : t("upToDate")}
      </Text>
    </Pill>
  );
}

function Pill({
  onDismiss,
  children,
}: {
  onDismiss?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const lift = useSharedValue(0);

  const swipe = Gesture.Pan()
    .enabled(onDismiss !== undefined)
    .onUpdate(({ translationY }) => {
      lift.set(Math.min(translationY, 0));
    })
    .onEnd(({ translationY, velocityY }) => {
      if (
        onDismiss &&
        (translationY < -DISMISS_DISTANCE || velocityY < -FLING_VELOCITY)
      )
        scheduleOnRN(onDismiss);
      else lift.set(withTiming(0));
    });
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.get() }],
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        testID="sync-pill"
        entering={FadeInUp}
        exiting={FadeOutUp}
        pointerEvents={onDismiss ? "auto" : "none"}
        style={[{ top: insets.top + 8 }, liftStyle]}
        className="bg-card border-border absolute flex-row items-center gap-2 self-center rounded-full border px-3.5 py-2 shadow-md"
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
