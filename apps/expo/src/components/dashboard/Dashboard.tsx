import { Suspense } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { useHomeVersion } from "~/utils/home-version";
import { useShoppingStore } from "~/utils/shopping-store";
import { GroupsDashboard } from "../groupDashboard/GroupsDashboard";
import { HomeInvite } from "../home/HomeSwitch";
import { InviteFlatmatesCard } from "../home/InviteFlatmatesCard";
import { GroupSwitcher } from "../switcher/GroupSwitcher";
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
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId } = useShoppingStore();
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
      queryClient.invalidateQueries(trpc.group.getUserGroups.pathFilter()),
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
        <View className="flex flex-row items-stretch gap-2">
          <GroupSwitcher testID="dashboard-group-picker" className="flex-1" />
          <Pressable
            testID="dashboard-group-settings"
            accessibilityRole="button"
            accessibilityLabel={t("navigation.groupSettings")}
            onPress={() =>
              router.navigate("/(tabs)/settings/group-settings", {
                withAnchor: true,
              })
            }
            className="border-border bg-card active:bg-muted aspect-square items-center justify-center rounded-2xl border shadow-sm"
          >
            <Icon name="settings" size={20} color="foreground" />
          </Pressable>
        </View>

        <InviteFlatmatesCard groupId={selectedGroupId} />

        {homeVersion === "undecided" && <HomeInvite />}

        <HomeStats groupId={selectedGroupId} />

        <QuickActions />

        <NavLinks />
      </View>
    </AppScrollView>
  );
}
