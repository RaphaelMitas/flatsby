import "~/polyfills";

import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { redactInvitePath } from "@flatsby/validators/invite";

import { getScreenName } from "~/utils/analytics/screen-names";
import { queryClient } from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";

import { InstallReferrerInvite } from "~/components/InstallReferrerInvite";
import { UpdateNudge } from "~/components/UpdateNudge";
import { ThemeProvider } from "~/lib/ui/theme";
import { useSolidHeader, useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";
import { isE2ETestingEnabled } from "~/utils/e2e";
import { IntlProvider } from "~/utils/intl-provider";
import { RevenueCatProvider } from "~/utils/revenuecat/revenuecat-provider";
import {
  ShoppingStoreProvider,
  useShoppingStore,
} from "~/utils/shopping-store";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const posthogDisabled = isE2ETestingEnabled() || __DEV__;
  const posthogApiKey = String(process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "");
  if (!posthogApiKey && !posthogDisabled)
    throw new Error("EXPO_PUBLIC_POSTHOG_API_KEY is not set");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <IntlProvider>
        <PostHogProvider
          apiKey={posthogApiKey || "phc-disabled"}
          // expo-router never exposes a NavigationContainer, so PostHog's screen
          // autocapture cannot read navigation state. ScreenTracker does it instead.
          autocapture={{ captureScreens: false }}
          options={{
            disabled: posthogDisabled,
            host: "https://eu.i.posthog.com",
            // Deep links reach PostHog as screen paths and the "Application Opened" url
            before_send: (event) =>
              event && {
                ...event,
                properties:
                  event.properties &&
                  Object.fromEntries(
                    Object.entries(event.properties).map(([key, value]) => [
                      key,
                      typeof value === "string"
                        ? redactInvitePath(value)
                        : value,
                    ]),
                  ),
              },
            errorTracking: {
              autocapture: {
                uncaughtExceptions: true,
                unhandledRejections: true,
                console: ["error"],
              },
            },
          }}
        >
          <KeyboardProvider>
            <SafeAreaProvider>
              <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                  <RevenueCatProvider>
                    <ShoppingStoreProvider>
                      {/**
                       The Stack component displays the current page.
                       It also allows you to configure your screens
                      **/}
                      <StackLayout />
                      <StatusBar />
                    </ShoppingStoreProvider>
                  </RevenueCatProvider>
                </QueryClientProvider>
              </ThemeProvider>
            </SafeAreaProvider>
          </KeyboardProvider>
        </PostHogProvider>
      </IntlProvider>
    </GestureHandlerRootView>
  );
}

function ScreenTracker() {
  const pathname = usePathname();
  const segments = useSegments();
  const posthog = usePostHog();

  useEffect(() => {
    const screenName = getScreenName(segments);
    void posthog.screen(screenName, { pathname });
  }, [pathname, segments, posthog]);

  return null;
}

const StackLayout = () => {
  const t = useTranslations();
  const themedScreenOptions = useThemedScreenOptions();
  const solidHeader = useSolidHeader();
  const { data, isPending } = useSession();
  const { hydrated } = useShoppingStore();
  const userId = data?.user.id;

  // Cached errors from a revoked session would sign the next login out again.
  // By now TabLayout's Redirect has unmounted the tabs; clearing under them
  // re-suspends their queries and crashes SwiftUI.
  useEffect(() => {
    if (!userId) queryClient.clear();
  }, [userId]);

  // The Expo client restores a cached session into data while it revalidates.
  if ((isPending && !data) || !hydrated) {
    return <View className="bg-background flex-1" />;
  }

  return (
    <View className="bg-background flex-1">
      <ScreenTracker />
      <InstallReferrerInvite />
      <UpdateNudge />
      <Stack
        screenOptions={{
          headerShown: false,
          ...themedScreenOptions,
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
    </View>
  );
};
