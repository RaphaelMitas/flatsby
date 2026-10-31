import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useRefreshControl } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import GroupsDashboardElement from "./GroupsDashboardElement";
import { StartOrJoin } from "./StartOrJoin";

export function GroupsDashboard() {
  const t = useTranslations();
  const router = useRouter();

  const { data: groups, refetch } = useSuspenseQuery(
    trpc.group.getUserGroups.queryOptions(),
  );
  const refreshControl = useRefreshControl(refetch);

  if (!groups.success) {
    return null;
  }

  if (groups.data.length === 0) {
    return <StartOrJoin />;
  }

  return (
    <View className="flex-1 flex-col gap-6 p-4">
      <View className="flex flex-row items-center justify-between">
        <Text
          testID="group-dashboard-title"
          className="text-foreground text-3xl font-bold"
        >
          {t("group.dashboard.title")}
        </Text>

        <Button
          testID="group-create-button"
          title={t("navigation.createGroup")}
          variant="primary"
          size="lg"
          icon="plus"
          onPress={() => router.push("/(tabs)/home/create-group")}
        />
      </View>

      <FlashList
        refreshControl={refreshControl}
        data={groups.data}
        ItemSeparatorComponent={() => <View className="h-4" />}
        renderItem={(item) => <GroupsDashboardElement group={item.item} />}
        ListFooterComponent={
          <Button
            testID="group-join-with-code-button"
            title={t("invite.join.withCode")}
            variant="outline"
            className="mt-4"
            onPress={() => router.push("/join")}
          />
        }
      />
    </View>
  );
}
