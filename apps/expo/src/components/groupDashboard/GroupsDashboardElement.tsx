import type { ApiResult, GroupWithMemberCount } from "@flatsby/api";
import type React from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useSwipeActions } from "../SwipeActions";

interface Props {
  group: Extract<
    RouterOutputs["group"]["getUserGroups"],
    { success: true }
  >["data"][number];
}

const GroupsDashboardElement: React.FC<Props> = ({ group }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { selectedGroupId, setSelectedGroup, clearSelectedGroup } =
    useShoppingStore();
  const isOptimistic = group.id === -1;

  const { renderLeftActions, renderRightActions } = useSwipeActions({
    leftAction: {
      text: "Edit",
      className: "bg-info",
      textClassName: "text-info-foreground",
    },
    rightAction: {
      text: "Delete",
      className: "bg-destructive",
      textClassName: "text-destructive-foreground",
    },
  });

  const onDeleteGroupError = (
    previousGroups: ApiResult<GroupWithMemberCount[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.group.getUserGroups.queryKey(),
      previousGroups,
    );
  };

  const deleteGroupMutation = useMutation(
    trpc.group.deleteGroup.mutationOptions({
      onMutate: () => {
        void queryClient.cancelQueries(trpc.group.getUserGroups.queryOptions());

        const previousGroups = queryClient.getQueryData(
          trpc.group.getUserGroups.queryKey(),
        );

        queryClient.setQueryData(trpc.group.getUserGroups.queryKey(), (old) => {
          if (!old?.success) return old;
          return {
            ...old,
            data: old.data.filter((g) => g.id !== group.id),
          };
        });

        if (selectedGroupId === group.id) {
          clearSelectedGroup();
        }

        return { previousGroups };
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onDeleteGroupError(context.previousGroups);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
      },
      onError: (error, variables, context) => {
        onDeleteGroupError(context?.previousGroups);
      },
    }),
  );

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
    router.push("/(tabs)/home/shopping-lists");
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
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          if (direction === SwipeDirection.RIGHT) {
            swipeableRef.current?.close();
            setSelectedGroup(group.id, group.name);
            router.push("/(tabs)/home/group-settings");
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
          <View className="flex flex-grow flex-row items-center gap-3">
            <Avatar>
              <AvatarImage alt="Group Avatar" src={undefined} />
              <AvatarFallback>
                {group.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <View className="flex-1 flex-row items-center justify-between">
              <View className="flex-1">
                <Text
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
                  {group.memberCount === 1
                    ? `${group.memberCount} member`
                    : `${group.memberCount} members`}
                </Text>
              </View>
              <Button
                title={isSelected ? "Go to Group" : "Select Group"}
                variant="outline"
                size="md"
                disabled={isOptimistic}
                onPress={handleGroupSelect}
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
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This action cannot be undone and will permanently remove all data associated with this group.`}
        confirmationLabel={`To confirm deletion, please type the group name: ${group.name}`}
      />
    </>
  );
};

export default GroupsDashboardElement;
