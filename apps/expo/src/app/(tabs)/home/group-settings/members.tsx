import type { ApiResult, GroupWithAccess } from "@flatsby/api";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { useFocusEffect, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { TimedAlert } from "~/components/TimedAlert";
import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Input } from "~/lib/ui/input";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { setMemberActionCallbacks } from "./member-actions";

type GroupMemberWithUser = Extract<
  RouterOutputs["group"]["getGroup"],
  { success: true }
>["data"]["groupMembers"][number];

const MemberCard = ({
  groupMember,
  currentUserGroupMember,
  onPress,
}: {
  groupMember: GroupMemberWithUser;
  currentUserGroupMember: GroupMemberWithUser;
  onPress: () => void;
}) => {
  const isUserAdmin = groupMember.role === "admin";
  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const canManage = isCurrentUserAdmin || isCurrentUser;

  return (
    <Pressable
      onPress={canManage ? onPress : undefined}
      className={`bg-background flex-row items-center justify-between px-4 py-3 ${
        canManage ? "active:bg-muted" : ""
      }`}
    >
      <View className="flex-1 flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={groupMember.user.image ?? undefined} />
          <AvatarFallback>
            {groupMember.user.name
              ? groupMember.user.name.substring(0, 2).toUpperCase()
              : "??"}
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className="text-foreground shrink font-medium"
              numberOfLines={1}
            >
              {groupMember.user.name}
            </Text>
            {isUserAdmin && (
              <Text className="text-muted-foreground ml-1 text-sm font-medium">
                (Admin)
              </Text>
            )}
          </View>
          <Text className="text-muted-foreground text-sm" numberOfLines={1}>
            {groupMember.user.email}
          </Text>
        </View>
        {canManage && <Icon name="ellipsis-vertical" size={16} />}
      </View>
    </Pressable>
  );
};

export default function MembersScreen() {
  const { selectedGroupId } = useShoppingStore();
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  const addGroupMemberMutation = useMutation(
    trpc.group.addGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId) || 0,
          }),
        );
        setNewMemberEmail("");
      },
    }),
  );

  const onUpdateMemberRoleError = (
    previousGroup: ApiResult<GroupWithAccess> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.group.getGroup.queryKey({
        id: Number(selectedGroupId) || 0,
      }),
      previousGroup,
    );
  };

  const updateMemberRoleMutation = useMutation(
    trpc.group.updateMemberRole.mutationOptions({
      onMutate: (data) => {
        void queryClient.cancelQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId) || 0,
          }),
        );

        const previousGroup = queryClient.getQueryData(
          trpc.group.getGroup.queryKey({
            id: Number(selectedGroupId) || 0,
          }),
        );

        queryClient.setQueryData(
          trpc.group.getGroup.queryKey({
            id: Number(selectedGroupId) || 0,
          }),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: {
                ...old.data,
                groupMembers: old.data.groupMembers.map((member) =>
                  member.id === data.memberId
                    ? { ...member, role: data.newRole }
                    : member,
                ),
              },
            };
          },
        );

        return { previousGroup };
      },
      onError: (error, variables, context) => {
        onUpdateMemberRoleError(context?.previousGroup);
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onUpdateMemberRoleError(context.previousGroup);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId) || 0,
          }),
        );
      },
    }),
  );

  const removeGroupMemberMutation = useMutation(
    trpc.group.removeGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: Number(selectedGroupId) || 0,
          }),
        );
      },
    }),
  );

  // Set up callbacks for the modal screen
  useFocusEffect(
    useCallback(() => {
      setMemberActionCallbacks({
        onUpdateRole: ({ memberId, newRole }) => {
          updateMemberRoleMutation.mutate({ memberId, newRole });
        },
        onRemoveMember: ({ memberId }) => {
          removeGroupMemberMutation.mutate({ memberId });
        },
      });
    }, [updateMemberRoleMutation, removeGroupMemberMutation]),
  );

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) return;

    addGroupMemberMutation.mutate({
      groupId: Number(selectedGroupId) || 0,
      memberEmail: newMemberEmail.trim(),
    });
  };

  const handleMemberPress = (memberId: number) => {
    router.push({
      pathname: "/(tabs)/home/group-settings/member-actions",
      params: { memberId: memberId.toString() },
    });
  };

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  const renderMemberItem = ({ item }: { item: GroupMemberWithUser }) => (
    <MemberCard
      groupMember={item}
      currentUserGroupMember={group.data.thisGroupMember}
      onPress={() => handleMemberPress(item.id)}
    />
  );

  const isAdmin = group.data.thisGroupMember.role === "admin";

  return (
    <AppScrollView>
      {/* Header */}
      <View className="bg-background px-4 py-6">
        <Text className="text-foreground text-2xl font-bold">
          Manage Members
        </Text>
        <Text className="text-muted-foreground text-sm">
          Add new members and update their roles.
        </Text>
      </View>

      {/* Add Member Section */}
      <View className="bg-card px-4 py-4">
        <Text className="text-foreground mb-3 text-base font-medium">
          Add Member
        </Text>
        <View className="gap-3">
          <Input
            placeholder={
              isAdmin ? "Enter email address" : "Only admins can add members"
            }
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            editable={isAdmin}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            title="Add Member"
            icon="plus"
            disabled={!isAdmin || !newMemberEmail.trim()}
            onPress={handleAddMember}
          />
        </View>
      </View>

      {/* Error Alert for Add Member */}
      {(addGroupMemberMutation.isError ||
        addGroupMemberMutation.data?.success === false) && (
        <View className="px-4 py-2">
          <TimedAlert
            variant="destructive"
            title={
              addGroupMemberMutation.data?.success === false
                ? addGroupMemberMutation.data.error.type
                : (addGroupMemberMutation.error?.data?.code ?? "Error")
            }
            description={
              addGroupMemberMutation.data?.success === false
                ? addGroupMemberMutation.data.error.message
                : (addGroupMemberMutation.error?.message ??
                  "Unknown error during member addition")
            }
            onDismiss={() => addGroupMemberMutation.reset()}
          />
        </View>
      )}

      {/* Success Alert for Add Member */}
      {addGroupMemberMutation.isSuccess &&
        addGroupMemberMutation.data.success === true && (
          <View className="px-4 py-2">
            <TimedAlert
              variant="success"
              title="Member added successfully!"
              onDismiss={() => addGroupMemberMutation.reset()}
            />
          </View>
        )}

      {/* Members List */}
      <View className="bg-background flex-1">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-foreground text-base font-medium">
            Members ({group.data.groupMembers.length})
          </Text>
        </View>
        <View className="flex-1">
          <FlashList
            data={group.data.groupMembers}
            renderItem={renderMemberItem}
            ItemSeparatorComponent={() => <View className="bg-border h-px" />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Error Alerts for Member Actions */}
      {(updateMemberRoleMutation.isError ||
        updateMemberRoleMutation.data?.success === false) && (
        <View className="px-4 py-2">
          <TimedAlert
            variant="destructive"
            title={
              updateMemberRoleMutation.data?.success === false
                ? updateMemberRoleMutation.data.error.type
                : (updateMemberRoleMutation.error?.data?.code ?? "Error")
            }
            description={
              updateMemberRoleMutation.data?.success === false
                ? updateMemberRoleMutation.data.error.message
                : (updateMemberRoleMutation.error?.message ??
                  "Unknown error during role update")
            }
            onDismiss={() => updateMemberRoleMutation.reset()}
          />
        </View>
      )}

      {(removeGroupMemberMutation.isError ||
        removeGroupMemberMutation.data?.success === false) && (
        <View className="px-4 py-2">
          <TimedAlert
            variant="destructive"
            title={
              removeGroupMemberMutation.data?.success === false
                ? removeGroupMemberMutation.data.error.type
                : (removeGroupMemberMutation.error?.data?.code ?? "Error")
            }
            description={
              removeGroupMemberMutation.data?.success === false
                ? removeGroupMemberMutation.data.error.message
                : (removeGroupMemberMutation.error?.message ??
                  "Unknown error during member removal")
            }
            onDismiss={() => removeGroupMemberMutation.reset()}
          />
        </View>
      )}

      {/* Success Alerts for Member Actions */}
      {updateMemberRoleMutation.isSuccess &&
        updateMemberRoleMutation.data.success === true && (
          <View className="px-4 py-2">
            <TimedAlert
              variant="success"
              title="Role updated successfully!"
              onDismiss={() => updateMemberRoleMutation.reset()}
            />
          </View>
        )}

      {removeGroupMemberMutation.isSuccess &&
        removeGroupMemberMutation.data.success === true && (
          <View className="px-4 py-2">
            <TimedAlert
              variant="success"
              title="Member removed successfully!"
              onDismiss={() => removeGroupMemberMutation.reset()}
            />
          </View>
        )}
    </AppScrollView>
  );
}
