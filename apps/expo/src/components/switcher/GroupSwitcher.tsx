import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { savedRows } from "@flatsby/api/resultMutation";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { Switcher } from "./Switcher";

export function GroupSwitcher({
  testID,
  className,
}: {
  testID: string;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { selectedGroupId, selectedGroupName, setSelectedGroup } =
    useShoppingStore();
  const { data } = useQuery(trpc.group.getUserGroups.queryOptions());
  const groups = savedRows(data);
  const memberCount = (count: number) => t("group.memberCount", { count });
  const current = groups.find(({ id }) => id === selectedGroupId);

  return (
    <Switcher
      barTestID={testID}
      sheetTestID="group-switcher"
      icon="house"
      title={current?.name ?? selectedGroupName ?? ""}
      subtitle={current ? memberCount(current.memberCount) : ""}
      sheetTitle={t("group.switcher.title")}
      items={groups.map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: memberCount(group.memberCount),
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
      className={className}
    />
  );
}
