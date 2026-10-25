import "~/polyfills";

import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { router, Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";

import { posthog } from "~/utils/analytics/posthog";
import { getScreenName } from "~/utils/analytics/screen-names";
import { queryClient } from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";

import { InstallReferrer } from "~/components/InstallReferrer";
import { UpdateNudge } from "~/components/UpdateNudge";
import { ThemeProvider } from "~/lib/ui/theme";
import { useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";
import { IntlProvider } from "~/utils/intl-provider";
import { RevenueCatProvider } from "~/utils/revenuecat/revenuecat-provider";
import {
  ShoppingStoreProvider,
  useShoppingStore,
} from "~/utils/shopping-store";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <IntlProvider>
        <PostHogProvider
          client={posthog}
          // expo-router never exposes a NavigationContainer, so PostHog's screen
          // autocapture cannot read navigation state. ScreenTracker does it instead.
          autocapture={{ captureScreens: false }}
        >
          <KeyboardProvider>
            <SafeAreaProvider>
              <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                  <RevenueCatProvider>
                    <ShoppingStoreProvider>
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

// Sign-in only stores the cookie and refetches; the index route is what leaves
// login for home or a remembered invite. Mounted with the stack, so a cold
// start's first session doesn't count as a sign-in.
function SignInNavigator() {
  const userId = useSession().data?.user.id;
  const previousUserId = useRef(userId);

  useEffect(() => {
    const arrived = userId !== undefined && userId !== previousUserId.current;
    previousUserId.current = userId;
    if (!arrived) return;
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
  const userId = data?.user.id;

  // Cached errors from a revoked session would sign the next login out again.
  // By now TabLayout's Redirect has unmounted the tabs; clearing under them
  // re-suspends their queries and crashes SwiftUI.
  useEffect(() => {
    if (!userId) queryClient.clear();
  }, [userId]);

  // The Expo client restores a cached session into data while it revalidates.
  // Later refetches (every app focus) set isPending again while signed out,
  // and blanking then would unmount the screen the user is on.
  if ((!sessionResolved && !data) || !hydrated) {
    return <View className="bg-background flex-1" />;
  }

  return (
    <View className="bg-background flex-1">
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
    </View>
  );
};
