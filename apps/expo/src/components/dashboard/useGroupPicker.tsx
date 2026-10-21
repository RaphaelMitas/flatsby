import { useRouter } from "expo-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { useBottomSheetPicker } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

const CREATE_GROUP_ID = "__create_group__";
const JOIN_GROUP_ID = "__join_group__";

export function useGroupPicker() {
  const t = useTranslations();
  const router = useRouter();
  const { openPicker } = useBottomSheetPicker();
  const { selectedGroupId, setSelectedGroup } = useShoppingStore();
  const { data: userWithGroups } = useSuspenseQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  return () => {
    if (!userWithGroups.success) return;
    openPicker({
      items: [
        ...userWithGroups.data.groups.map((group) => ({
          id: String(group.id),
          title: group.name,
        })),
        {
          id: CREATE_GROUP_ID,
          title: t("home.createGroup"),
          icon: <Icon name="plus" size={20} color="muted-foreground" />,
        },
        {
          id: JOIN_GROUP_ID,
          title: t("invite.join.withCode"),
          icon: <Icon name="key-round" size={20} color="muted-foreground" />,
        },
      ],
      selectedId: selectedGroupId ? String(selectedGroupId) : undefined,
      onSelect: (item) => {
        if (item.id === CREATE_GROUP_ID) {
          router.push("/(tabs)/home/create-group");
          return;
        }
        if (item.id === JOIN_GROUP_ID) {
          router.push("/join");
          return;
        }
        const groupId = parseInt(item.id, 10);
        if (groupId !== selectedGroupId) {
          setSelectedGroup(groupId, item.title);
        }
      },
    });
  };
}
