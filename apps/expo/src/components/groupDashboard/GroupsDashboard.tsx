import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { PullToRefresh } from "~/lib/components/pull-to-refresh";
import { Button } from "~/lib/ui/button";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import GroupsDashboardElement from "./GroupsDashboardElement";

export function GroupsDashboard() {
  const t = useTranslations();
  const router = useRouter();

  const {
    data: groups,
    refetch,
    isRefetching,
  } = useSuspenseQuery(trpc.group.getUserGroups.queryOptions());

  if (!groups.success) {
    return handleApiError({ router, error: groups.error });
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

      {groups.data.length === 0 && (
        <View className="flex flex-col items-center justify-center gap-4">
          <Text className="text-foreground text-center text-lg font-semibold">
            {t("group.dashboard.empty")}
          </Text>
          <Button
            title={t("group.create.title")}
            variant="primary"
            size="lg"
            onPress={() => router.push("/(tabs)/home/create-group")}
          />
        </View>
      )}
      <PullToRefresh
        refreshing={isRefetching}
        onRefresh={refetch}
        parentPaddingX={16}
      >
        {(refreshProps) => (
          <FlashList
            {...refreshProps}
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
        )}
      </PullToRefresh>
    </View>
  );
}
