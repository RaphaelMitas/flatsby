import "~/polyfills";

import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslations } from "use-intl";

import { usePostHogClient } from "~/utils/analytics/posthog";
import { getScreenName } from "~/utils/analytics/screen-names";
import {
  clearQueryCache,
  persistOptions,
  queryClient,
  trpc,
} from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { useIsRestoring } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { AnalyticsSync } from "~/components/analytics/AnalyticsSync";
import { CacheRefreshPill } from "~/components/CacheRefreshPill";
import { InstallReferrer } from "~/components/InstallReferrer";
import { UpdateNudge } from "~/components/UpdateNudge";
import { restoreTheme } from "~/lib/ui/theme";
import { useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";
import { IntlProvider } from "~/utils/intl-provider";
import { useShoppingStore } from "~/utils/shopping-store";

void restoreTheme();

export default function RootLayout() {
  const posthog = usePostHogClient();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <IntlProvider>
        <PostHogProvider
          client={posthog}
          autocapture={{ captureScreens: false }}
        >
          <KeyboardProvider>
            <SafeAreaProvider>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={persistOptions}
                onSuccess={() => {
                  void queryClient.resumePausedMutations();
                }}
              >
                <StackLayout />
                <StatusBar />
              </PersistQueryClientProvider>
            </SafeAreaProvider>
          </KeyboardProvider>
        </PostHogProvider>
      </IntlProvider>
    </GestureHandlerRootView>
  );
}

function ScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    const screenName = getScreenName(segments);
    void posthog.screen(screenName, { pathname });
  }, [posthog, pathname, segments]);

  return null;
}

function SignInNavigator() {
  const userId = useSession().data?.user.id;
  const previousUserId = useRef(userId);

  useEffect(() => {
    const arrived = userId !== undefined && userId !== previousUserId.current;
    previousUserId.current = userId;
    if (!arrived) return;
    void queryClient.prefetchQuery(trpc.group.getUserGroups.queryOptions());
    if (router.canDismiss()) router.dismissAll();
    router.replace("/");
  }, [userId]);

  return null;
}

const StackLayout = () => {
  const t = useTranslations();
  const { screenOptions, solidHeader } = useThemedScreenOptions();
  const { data, isPending } = useSession();
  const [sessionResolved, setSessionResolved] = useState(!isPending);
  if (!isPending && !sessionResolved) setSessionResolved(true);
  const { hydrated } = useShoppingStore();
  const isRestoring = useIsRestoring();
  const userId = data?.user.id;

  useEffect(() => {
    if (!isRestoring && sessionResolved && !userId) clearQueryCache();
  }, [isRestoring, sessionResolved, userId]);

  if ((!sessionResolved && !data) || !hydrated || isRestoring) {
    return <View className="bg-background flex-1" />;
  }

  return (
    <View className="bg-background flex-1">
      <AnalyticsSync />
      <ScreenTracker />
      <SignInNavigator />
      <InstallReferrer />
      <UpdateNudge />
      <Stack
        screenOptions={{
          headerShown: false,
          ...screenOptions,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/login/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="join/index"
          options={{
            title: t("invite.join.title"),
            presentation: "modal",
            headerShown: true,
            ...solidHeader,
          }}
        />
        <Stack.Screen name="join/[code]" options={{ presentation: "modal" }} />
      </Stack>
      <CacheRefreshPill />
    </View>
  );
};
