import type { GroupWithAccess } from "@flatsby/api";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

type Render = (group: GroupWithAccess) => ReactNode;

export function CalendarGroupGate({ children }: { children: Render }) {
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
  const router = useRouter();
  const { data } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  if (!data.success) return handleApiError({ router, error: data.error });
  return children(data.data);
}
