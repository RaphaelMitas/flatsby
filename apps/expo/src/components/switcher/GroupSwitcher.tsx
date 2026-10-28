import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { PENDING_ID } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { Switcher } from "./Switcher";

export function GroupSwitcher({
  testIDPrefix,
  className,
}: {
  testIDPrefix: string;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { selectedGroupId, selectedGroupName, setSelectedGroup } =
    useShoppingStore();
  const { data } = useQuery(trpc.group.getUserGroups.queryOptions());
  // A group still being created has a placeholder id and can't be selected yet
  const groups = (data?.success ? data.data : []).filter(
    ({ id }) => id !== PENDING_ID,
  );
  const memberCount = (count: number) => t("group.memberCount", { count });
  const current = groups.find(({ id }) => id === selectedGroupId);
  const openSettings = () =>
    router.navigate("/(tabs)/settings/group-settings", { withAnchor: true });

  return (
    <Switcher
      barTestID={`${testIDPrefix}-picker`}
      sheetTestID="group-switcher"
      icon="house"
      title={current?.name ?? selectedGroupName ?? ""}
      subtitle={current ? memberCount(current.memberCount) : ""}
      sheetTitle={t("group.switcher.title")}
      items={groups.map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: memberCount(group.memberCount),
        // Settings act on the selected group, so only its own row offers them
        more:
          group.id === selectedGroupId
            ? {
                label: t("navigation.groupSettings"),
                onPress: openSettings,
              }
            : undefined,
      }))}
      selectedId={selectedGroupId}
      onSelect={(group) => {
        if (group.id !== selectedGroupId)
          setSelectedGroup(group.id, group.title);
      }}
      actions={[
        {
          testID: "group-switcher-create",
          icon: "plus",
          title: t("home.createGroup"),
          onPress: () => router.push("/(tabs)/home/create-group"),
        },
        {
          testID: "group-switcher-join",
          icon: "key-round",
          title: t("invite.join.withCode"),
          onPress: () => router.push("/join"),
        },
      ]}
      settings={{
        testID: `${testIDPrefix}-settings`,
        label: t("navigation.groupSettings"),
        onPress: openSettings,
      }}
      className={className}
    />
  );
}
