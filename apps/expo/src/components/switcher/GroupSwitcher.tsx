import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef } from "react";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { SwitcherBar } from "./SwitcherBar";
import { SwitcherSheet } from "./SwitcherSheet";

export function GroupSwitcher({
  testID,
  className,
}: {
  testID: string;
  className?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { selectedGroupId, selectedGroupName, setSelectedGroup } =
    useShoppingStore();
  const { data } = useQuery(trpc.group.getUserGroups.queryOptions());
  // A group still being created has a placeholder id and can't be selected yet
  const groups = (data?.success ? data.data : []).filter(({ id }) => id > 0);
  const memberCount = (count: number) => t("group.memberCount", { count });
  const current = groups.find(({ id }) => id === selectedGroupId);

  return (
    <>
      <SwitcherBar
        testID={testID}
        icon="house"
        title={current?.name ?? selectedGroupName ?? ""}
        subtitle={current ? memberCount(current.memberCount) : ""}
        onPress={() => sheetRef.current?.present()}
        className={className}
      />
      <SwitcherSheet
        sheetRef={sheetRef}
        testID="group-switcher"
        title={t("group.switcher.title")}
        icon="house"
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
      />
    </>
  );
}
