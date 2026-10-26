import type { GroupWithAccess } from "@flatsby/api";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

type Render = (group: GroupWithAccess) => ReactNode;

export function GroupGate({ children }: { children: Render }) {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-muted-foreground text-center">
          {t("common.noGroupSelectedHint")}
        </Text>
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <GroupLoader groupId={selectedGroupId}>{children}</GroupLoader>
    </Suspense>
  );
}

function GroupLoader({
  groupId,
  children,
}: {
  groupId: number;
  children: Render;
}) {
  const { data } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  if (!data.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {data.error.message}
        </Text>
      </View>
    );
  }
  return children(data.data);
}
