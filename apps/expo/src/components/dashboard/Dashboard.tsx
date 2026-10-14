import { Suspense, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import {
  BottomSheetPickerProvider,
  useBottomSheetPicker,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { GroupsDashboard } from "../groupDashboard/GroupsDashboard";
import { HomeStats } from "./HomeStats";
import { NavLinks } from "./NavLinks";
import { QuickActions } from "./QuickActions";

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
  const { openPicker } = useBottomSheetPicker();
  const { selectedGroupId, selectedGroupName, setSelectedGroup } =
    useShoppingStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.user.getCurrentUserWithGroups.pathFilter(),
      ),
      queryClient.invalidateQueries(trpc.group.getGroup.pathFilter()),
      queryClient.invalidateQueries(trpc.expense.getDebtSummary.pathFilter()),
      queryClient.invalidateQueries(trpc.stats.getHomeStats.pathFilter()),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const CREATE_GROUP_ID = "__create_group__";

  const groupItems = useMemo(() => {
    if (!userWithGroups.success) return [];
    const groups = userWithGroups.data.groups.map((group) => ({
      id: String(group.id),
      title: group.name,
    }));
    return [
      ...groups,
      {
        id: CREATE_GROUP_ID,
        title: t("home.createGroup"),
        icon: <Icon name="plus" size={20} color="muted-foreground" />,
      },
    ];
  }, [userWithGroups, t]);

  const handleOpenGroupPicker = useCallback(() => {
    openPicker({
      items: groupItems,
      selectedId: selectedGroupId ? String(selectedGroupId) : undefined,
      onSelect: (item) => {
        if (item.id === CREATE_GROUP_ID) {
          router.push("/(tabs)/home/create-group");
          return;
        }
        const groupId = parseInt(item.id, 10);
        if (groupId !== selectedGroupId) {
          setSelectedGroup(groupId, item.title);
        }
      },
      snapPoints: ["40%"],
    });
  }, [openPicker, groupItems, selectedGroupId, setSelectedGroup, router]);

  if (!selectedGroupId) {
    return null;
  }

  if (!userWithGroups.success) {
    return handleApiError({ router, error: userWithGroups.error });
  }

  return (
    <AppScrollView
      className="flex-1"
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View className="flex flex-col gap-6 p-2">
        <View className="flex flex-row items-center justify-between gap-2">
          <Button
            testID="dashboard-group-picker"
            className="flex-1"
            onPress={handleOpenGroupPicker}
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

        <HomeStats groupId={selectedGroupId} />

        <QuickActions />

        <NavLinks />
      </View>
    </AppScrollView>
  );
}
