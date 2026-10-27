import type React from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useTranslations } from "use-intl";

import type { RouterOutputs } from "~/utils/api";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import { cn } from "~/lib/utils";
import { useShoppingStore } from "~/utils/shopping-store";
import { useDeleteGroup } from "~/utils/useDeleteGroup";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";

interface Props {
  group: Extract<
    RouterOutputs["group"]["getUserGroups"],
    { success: true }
  >["data"][number];
}

const GroupsDashboardElement: React.FC<Props> = ({ group }) => {
  const t = useTranslations();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const router = useRouter();
  const { selectedGroupId, setSelectedGroup } = useShoppingStore();
  const isOptimistic = group.id === -1;

  const { swipeableProps, guardPress } = useSwipeActions({
    leftAction: {
      text: t("common.edit"),
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: t("common.delete"),
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

  const deleteGroupMutation = useDeleteGroup();

  const handleDeleteGroup = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteGroupMutation.mutate({ id: group.id });
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  const handleGroupSelect = () => {
    setSelectedGroup(group.id, group.name);
    router.navigate("/(tabs)/home");
  };

  const isSelected = selectedGroupId === group.id;

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!isOptimistic}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        {...swipeableProps}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.RIGHT) {
            swipeableRef.current?.close();
            setSelectedGroup(group.id, group.name);
            router.navigate("/(tabs)/settings/group-settings", {
              withAnchor: true,
            });
          } else {
            swipeableRef.current?.close();
            setShowDeleteModal(true);
          }
        }}
      >
        <View
          className={cn(
            "bg-muted flex flex-row rounded-lg p-4",
            isSelected && "bg-primary",
            isOptimistic && "animate-pulse",
          )}
        >
          <View className="flex grow flex-row items-center gap-3">
            <Avatar>
              <AvatarImage alt={t("group.avatarAlt")} src={undefined} />
              <AvatarFallback>
                {group.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <View className="flex-1 flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  testID="group-card-name"
                  className={cn(
                    "text-primary text-lg font-semibold",
                    isSelected && "text-primary-foreground",
                  )}
                >
                  {group.name}
                </Text>
                <Text
                  className={cn(
                    "text-muted-foreground mt-1 text-sm",
                    isSelected && "text-muted",
                  )}
                >
                  {t("group.memberCount", { count: group.memberCount })}
                </Text>
              </View>
              <Button
                testID="group-select-button"
                title={
                  isSelected
                    ? t("group.dashboard.goToGroup")
                    : t("group.dashboard.selectGroup")
                }
                variant="outline"
                size="md"
                disabled={isOptimistic}
                onPress={guardPress(handleGroupSelect)}
                icon={isSelected ? "chevron-right" : undefined}
              />
            </View>
          </View>
        </View>
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteGroup}
        itemName={group.name}
        title={t("group.delete.title")}
        description={t("group.delete.description", { name: group.name })}
        confirmationLabel={t("group.delete.confirmationLabel", {
          name: group.name,
        })}
        needsConfirmationInput
      />
    </>
  );
};

export default GroupsDashboardElement;
