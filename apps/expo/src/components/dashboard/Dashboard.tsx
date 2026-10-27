import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { useHomeVersion } from "~/utils/home-version";
import { useShoppingStore } from "~/utils/shopping-store";
import { GroupsDashboard } from "../groupDashboard/GroupsDashboard";
import { HomeInvite } from "../home/HomeSwitch";
import { HomeStats } from "./HomeStats";
import { NavLinks } from "./NavLinks";
import { QuickActions } from "./QuickActions";
import { useGroupPicker } from "./useGroupPicker";

export function Dashboard() {
  const t = useTranslations("home");
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return <GroupsDashboard />;
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-muted-foreground mt-4">
            {t("loadingDashboard")}
          </Text>
        </View>
      }
    >
      <DashboardWithGroup />
    </Suspense>
  );
}

function DashboardWithGroup() {
  return (
    <BottomSheetPickerProvider>
      <DashboardContent />
    </BottomSheetPickerProvider>
  );
}

function DashboardContent() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const openGroupPicker = useGroupPicker();
  const { selectedGroupId, selectedGroupName } = useShoppingStore();
  const { version: homeVersion } = useHomeVersion();

  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  const handleRefresh = () =>
    Promise.all([
      queryClient.invalidateQueries(
        trpc.user.getCurrentUserWithGroups.pathFilter(),
      ),
      queryClient.invalidateQueries(trpc.group.getGroup.pathFilter()),
      queryClient.invalidateQueries(trpc.expense.getDebtSummary.pathFilter()),
      queryClient.invalidateQueries(trpc.stats.getHomeStats.pathFilter()),
    ]);

  if (!selectedGroupId) {
    return null;
  }

  if (!userWithGroups.success) {
    return null;
  }

  return (
    <AppScrollView className="flex-1" onRefresh={handleRefresh}>
      <View className="flex flex-col gap-6 p-2">
        <View className="flex flex-row items-center justify-between gap-2">
          <Button
            testID="dashboard-group-picker"
            className="flex-1"
            onPress={openGroupPicker}
            variant="outline"
            title={selectedGroupName ?? t("home.selectGroup")}
            icon="chevron-down"
          />
          <Button
            testID="dashboard-group-settings"
            title={t("navigation.groupSettings")}
            variant="outline"
            icon="settings"
            onPress={() =>
              router.navigate("/(tabs)/settings/group-settings", {
                withAnchor: true,
              })
            }
          />
        </View>

        {homeVersion === "undecided" && <HomeInvite />}

        <HomeStats groupId={selectedGroupId} />

        <QuickActions />

        <NavLinks />
      </View>
    </AppScrollView>
  );
}
