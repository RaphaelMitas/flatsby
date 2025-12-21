import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { queryClient } from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "~/lib/ui/theme";
import { useThemedScreenOptions } from "~/lib/utils";
import { ShoppingStoreProvider } from "~/utils/shopping-store";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ShoppingStoreProvider>
            {/*
              The Stack component displays the current page.
              It also allows you to configure your screens 
            */}

            <StackLayout />

            <StatusBar />
          </ShoppingStoreProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const StackLayout = () => {
  const themedScreenOptions = useThemedScreenOptions();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...themedScreenOptions,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
    </Stack>
  );
};
