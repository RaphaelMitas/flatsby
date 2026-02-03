import { Suspense, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

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
            Loading dashboard...
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
    await queryClient.invalidateQueries();
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
        title: "Create group",
        icon: <Icon name="plus" size={20} color="muted-foreground" />,
      },
    ];
  }, [userWithGroups]);

  const handleOpenGroupPicker = useCallback(() => {
    openPicker({
      items: groupItems,
      selectedId: selectedGroupId ? String(selectedGroupId) : undefined,
      onSelect: (item) => {
        if (item.id === CREATE_GROUP_ID) {
          router.push("/(tabs)/home/create-group");
          return;
        }
        const groupId = parseInt(item.id);
        if (groupId !== selectedGroupId) {
          setSelectedGroup(groupId, item.title);
          void queryClient.invalidateQueries();
        }
      },
      snapPoints: ["40%"],
    });
  }, [
    openPicker,
    groupItems,
    selectedGroupId,
    setSelectedGroup,
    queryClient,
    router,
  ]);

  if (!selectedGroupId) {
    return null;
  }

  if (!userWithGroups.success) {
    return handleApiError({ router, error: userWithGroups.error });
  }

  return (
    <AppScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="flex flex-col gap-6 p-2">
        <View className="flex flex-row items-center justify-between gap-2">
          <Button
            className="flex-1"
            onPress={handleOpenGroupPicker}
            variant="outline"
            title={selectedGroupName ?? "select group"}
            icon="chevron-down"
          />
          <Button
            title="Group Settings"
            variant="outline"
            icon="settings"
            onPress={() => router.push("/(tabs)/home/group-settings")}
          />
        </View>

        <HomeStats groupId={selectedGroupId} />

        <QuickActions />

        <NavLinks />
      </View>
    </AppScrollView>
  );
}
