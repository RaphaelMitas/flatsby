import "~/polyfills";

import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, usePathname, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { usePostHog } from "posthog-react-native";

import { queryClient } from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";

import { ThemeProvider } from "~/lib/ui/theme";
import { WinterEffectsProvider } from "~/lib/ui/winter-effects";
import { WinterSnow } from "~/lib/ui/winter-snow";
import { useThemedScreenOptions } from "~/lib/utils";
import { useSession } from "~/utils/auth/auth-client";
import { ShoppingStoreProvider } from "~/utils/shopping-store";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? ""}
        options={{
          host: "https://eu.i.posthog.com",
          errorTracking: {
            autocapture: {
              uncaughtExceptions: true,
              unhandledRejections: true,
              console: ["error", "warn"],
            },
          },
        }}
      >
        <KeyboardProvider>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <ThemeProvider>
                <WinterEffectsProvider>
                  <QueryClientProvider client={queryClient}>
                    <ShoppingStoreProvider>
                      {/**
                       The Stack component displays the current page.
                       It also allows you to configure your screens
                      **/}
                      <StackLayout />
                      <StatusBar />
                    </ShoppingStoreProvider>
                  </QueryClientProvider>
                </WinterEffectsProvider>
              </ThemeProvider>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </KeyboardProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

function getScreenName(segments: string[]): string {
  const filtered = segments.filter((s) => !s.startsWith("("));
  const key = filtered.join("/");

  const names: Record<string, string> = {
    home: "Home",
    "home/create-group": "Create Group",
    "home/group-settings": "Group Settings",
    "home/group-settings/members": "Group Members",
    "home/group-settings/member-actions": "Member Actions",
    "home/group-settings/group-details": "Group Details",
    "home/shopping-lists": "Shopping Lists",
    "home/shopping-lists/create": "Create Shopping List",
    shoppingList: "Shopping List",
    "shoppingList/edit-item": "Edit Shopping Item",
    expenses: "Expenses",
    "expenses/create": "Create Expense",
    "expenses/debts": "Debts",
    "expenses/settle": "Settle Debts",
    chat: "Chat",
    "chat/new": "New Chat",
    settings: "Settings",
    "settings/account": "Account Settings",
    "settings/profile": "Profile",
    "settings/manage-groups": "Manage Groups",
    "settings/danger": "Danger Zone",
    "auth/login": "Login",
  };

  if (key.includes("[expenseId]")) {
    if (key.endsWith("/edit")) return "Edit Expense";
    return "Expense Detail";
  }
  if (key.includes("[conversationId]")) return "Chat Conversation";

  return names[key] ?? filtered.join(" > ");
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
  const themedScreenOptions = useThemedScreenOptions();
  const { isPending } = useSession();

  if (isPending) {
    return <View className="bg-background flex-1" />;
  }

  return (
    <View className="bg-background flex-1">
      <WinterSnow />
      <ScreenTracker />
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
      </Stack>
    </View>
  );
};
