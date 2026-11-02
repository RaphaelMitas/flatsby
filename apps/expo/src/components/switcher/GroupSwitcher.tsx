import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import { useShoppingStore } from "~/utils/shopping-store";
import { useSelectedGroup } from "~/utils/useSelectedGroup";
import { Switcher } from "./Switcher";

export function GroupSwitcher({
  testID,
  settingsTestID,
  className,
}: {
  testID: string;
  settingsTestID: string;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { selectedGroupId, setSelectedGroup } = useShoppingStore();
  const { groups, group: current, name } = useSelectedGroup();
  const memberCount = (count: number) => t("group.memberCount", { count });
  const settings = {
    label: t("navigation.groupSettings"),
    onPress: () =>
      router.navigate("/(tabs)/settings/group-settings", { withAnchor: true }),
  };

  return (
    <Switcher
      barTestID={testID}
      sheetTestID="group-switcher"
      icon="house"
      title={name ?? ""}
      subtitle={current ? memberCount(current.memberCount) : ""}
      sheetTitle={t("group.switcher.title")}
      items={groups.map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: memberCount(group.memberCount),
        // Settings act on the selected group, so only its own row offers them
        more: group.id === selectedGroupId ? settings : undefined,
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
      settings={{ ...settings, testID: settingsTestID }}
      className={className}
    />
  );
}
