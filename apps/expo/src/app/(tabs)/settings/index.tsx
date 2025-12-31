import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";
import { useCallback, useRef } from "react";
import { View } from "react-native";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { Stack, useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  SettingsHeader,
  SettingsItem,
  SettingsSection,
} from "~/components/settings";
import { Button } from "~/lib/ui/button";
import { Checkbox } from "~/lib/ui/checkbox";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { useTheme } from "~/lib/ui/theme";
import { useWinterEffects } from "~/lib/ui/winter-effects";
import { trpc } from "~/utils/api";
import { signOut } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

export default function SettingsIndex() {
  const router = useRouter();
  const { storedTheme, setTheme } = useTheme();
  const {
    isEnabled: isWinterEffectsEnabled,
    setEnabled: setWinterEffectsEnabled,
  } = useWinterEffects();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const { clearSelectedGroup } = useShoppingStore();

  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );

  const handleLogout = async () => {
    clearSelectedGroup();
    await signOut();
  };

  const getThemeDisplayName = (theme: "light" | "dark" | "system" | null) => {
    switch (theme) {
      case "dark":
        return "Dark";
      case "light":
        return "Light";
      case "system":
        return "System";
      default:
        return "System";
    }
  };

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      return (
        <View className="h-full w-full flex-row gap-2 p-2">
          <Button
            title="System"
            icon="sun-moon"
            className="flex-1"
            variant={storedTheme === "system" ? "primary" : "outline"}
            onPress={() => {
              setTheme("system");
              swipeableRef.current?.close();
            }}
          />
          <Button
            title="Light"
            icon="sun"
            className="flex-1"
            variant={storedTheme === "light" ? "primary" : "outline"}
            onPress={() => {
              setTheme("light");
              swipeableRef.current?.close();
            }}
          />
          <Button
            title="Dark"
            icon="moon"
            className="flex-1"
            variant={storedTheme === "dark" ? "primary" : "outline"}
            onPress={() => {
              setTheme("dark");
              swipeableRef.current?.close();
            }}
          />
        </View>
      );
    },
    [storedTheme, setTheme],
  );

  return (
    <SafeAreaView>
      <Stack.Screen options={{ title: "Settings" }} />
      <AppScrollView>
        <SettingsHeader title={user.name} />

        <SettingsSection title="Appearance">
          <ReanimatedSwipeable
            ref={swipeableRef}
            friction={2}
            leftThreshold={40}
            rightThreshold={40}
            renderRightActions={renderRightActions}
          >
            <SettingsItem
              title="Theme"
              subtitle={`Currently using ${getThemeDisplayName(storedTheme)} theme`}
              iconName="palette"
              onPress={() => swipeableRef.current?.openRight()}
            />
          </ReanimatedSwipeable>
          <SettingsItem
            title="Winter Effects"
            subtitle={isWinterEffectsEnabled ? "Enabled" : "Disabled"}
            iconName="snowflake"
            onPress={() => setWinterEffectsEnabled(!isWinterEffectsEnabled)}
            rightContent={
              <Checkbox
                checked={isWinterEffectsEnabled}
                onCheckedChange={setWinterEffectsEnabled}
              />
            }
          />
        </SettingsSection>
        <SettingsSection title="Groups">
          <SettingsItem
            title="Your Groups"
            subtitle="Manage your groups"
            iconName="arrow-left-right"
            onPress={() => {
              router.push("/groups");
            }}
          />
        </SettingsSection>
        <SettingsSection title="Account">
          <SettingsItem
            title="Profile"
            subtitle="Edit your name and profile picture"
            iconName="user"
            onPress={() => router.push("/settings/profile")}
          />
          <SettingsItem
            title="Account"
            subtitle="Manage your account settings"
            iconName="settings"
            onPress={() => router.push("/settings/account")}
          />
          <SettingsItem
            title="Logout"
            subtitle="Sign out of your account"
            iconName="log-out"
            onPress={handleLogout}
          />
        </SettingsSection>
        <SettingsSection title="Danger Zone" className="pb-4">
          <SettingsItem
            title="Delete Account"
            subtitle="Permanently delete your account"
            iconName="trash-2"
            onPress={() => router.push("/settings/danger")}
            variant="destructive"
          />
        </SettingsSection>
      </AppScrollView>
    </SafeAreaView>
  );
}
