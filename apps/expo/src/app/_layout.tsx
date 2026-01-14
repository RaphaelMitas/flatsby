import "~/polyfills";

import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

import { queryClient } from "~/utils/api";

import "../styles.css";
import "~/lib/nativewind-setup";

import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "~/lib/ui/theme";
import { WinterEffectsProvider } from "~/lib/ui/winter-effects";
import { WinterSnow } from "~/lib/ui/winter-snow";
import { useThemedScreenOptions } from "~/lib/utils";
import { ShoppingStoreProvider } from "~/utils/shopping-store";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <ThemeProvider>
              <WinterEffectsProvider>
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
              </WinterEffectsProvider>
            </ThemeProvider>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const StackLayout = () => {
  const themedScreenOptions = useThemedScreenOptions();

  return (
    <View className="bg-background flex-1">
      <WinterSnow />
      <Stack
        screenOptions={{
          headerShown: false,
          ...themedScreenOptions,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
};
