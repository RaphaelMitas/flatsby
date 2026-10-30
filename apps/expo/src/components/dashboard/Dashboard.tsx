import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { AnalyticsPrompt } from "~/components/analytics/AnalyticsPrompt";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
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
        <GroupSwitcher
          testID="dashboard-group-picker"
          settingsTestID="dashboard-group-settings"
        />

        <InviteFlatmatesCard groupId={selectedGroupId} />
        <AnalyticsPrompt />

        {homeVersion === "undecided" && <HomeInvite />}

        <HomeStats groupId={selectedGroupId} />

        <QuickActions />

        <NavLinks />
      </View>
    </AppScrollView>
  );
}
