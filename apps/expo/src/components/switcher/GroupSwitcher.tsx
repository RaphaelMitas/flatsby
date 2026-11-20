import type { ReactNode, Ref } from "react";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import type { SwitcherSheetHandle, SwitcherSheetProps } from "./Switcher";
import { useShoppingStore } from "~/utils/shopping-store";
import { useSelectedGroup } from "~/utils/useSelectedGroup";
import { Switcher, SwitcherSheet } from "./Switcher";

function useGroupSwitcher() {
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

  return {
    title: name ?? "",
    subtitle: current ? memberCount(current.memberCount) : "",
    settings,
    sheet: {
      sheetTestID: "group-switcher",
      icon: "house",
      sheetTitle: t("group.switcher.title"),
      items: groups.map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: memberCount(group.memberCount),
        more: group.id === selectedGroupId ? settings : undefined,
      })),
      selectedId: selectedGroupId,
      onSelect: (group) => {
        if (group.id !== selectedGroupId)
          setSelectedGroup(group.id, group.title);
      },
      actions: [
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
      ],
    } satisfies SwitcherSheetProps,
  };
}

export function GroupSwitcher({
  testID,
  settingsTestID,
  className,
  children,
}: {
  testID: string;
  settingsTestID: string;
  className?: string;
  children?: ReactNode;
}) {
  const { title, subtitle, settings, sheet } = useGroupSwitcher();

  return (
    <Switcher
      barTestID={testID}
      title={title}
      subtitle={subtitle}
      settings={{ ...settings, testID: settingsTestID }}
      className={className}
      {...sheet}
    >
      {children}
    </Switcher>
  );
}

export function GroupSwitcherSheet({ ref }: { ref: Ref<SwitcherSheetHandle> }) {
  return <SwitcherSheet ref={ref} {...useGroupSwitcher().sheet} />;
}
