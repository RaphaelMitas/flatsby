import { useCallback } from "react";
import { Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  failureOf,
  restoreSnapshot,
  resultMutation,
} from "@flatsby/api/resultMutation";
import { hasJoined } from "@flatsby/validators/group";

import { MemberRow } from "~/components/members/MemberRow";
import { PlaceholderMembers } from "~/components/members/PlaceholderMembers";
import { TimedAlert } from "~/components/TimedAlert";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { setMemberActionCallbacks } from "./member-actions";

export default function MembersScreen() {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupQueryKey = trpc.group.getGroup.queryKey({
    id: Number(selectedGroupId) || 0,
  });

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  const updateMemberRoleMutation = useMutation(
    trpc.group.updateMemberRole.mutationOptions(
      resultMutation({
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
                success: true as const,
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

          return [{ queryKey: groupQueryKey, previous: previousGroup }];
        },
        rollback: restoreSnapshot(queryClient),
        onSuccess: () => {
          void queryClient.invalidateQueries(
            trpc.group.getGroup.queryOptions({
              id: Number(selectedGroupId) || 0,
            }),
          );
        },
      }),
    ),
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
        void queryClient.invalidateQueries(
          trpc.invite.get.queryFilter({
            groupId: Number(selectedGroupId) || 0,
          }),
        );
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
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

  const handleMemberPress = (memberId: number) => {
    router.push({
      pathname: "/(tabs)/settings/group-settings/member-actions",
      params: { memberId: memberId.toString() },
    });
  };

  const roleUpdateFailure = failureOf(
    updateMemberRoleMutation,
    t("group.members.roleUpdateFailed"),
  );
  const removeFailure = failureOf(
    removeGroupMemberMutation,
    t("group.members.removeFailed"),
  );

  if (!group.success) {
    return null;
  }

  const me = group.data.thisGroupMember;
  const isAdmin = me.role === "admin";
  const joinedMembers = group.data.groupMembers.filter(hasJoined);

  return (
    <AppScrollView>
      {/* Header */}
      <View className="bg-background px-4 py-6">
        <Text className="text-foreground text-2xl font-bold">
          {t("group.members.title")}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("group.members.description")}
        </Text>
      </View>

      {isAdmin && (
        <View className="px-4 pb-4">
          <Button
            testID="group-invite-button"
            title={t("invite.open")}
            icon="plus"
            onPress={() =>
              router.push("/(tabs)/settings/group-settings/invite")
            }
          />
        </View>
      )}

      {/* Members List */}
      <View className="bg-background">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text
            testID={`group-members-count-${joinedMembers.length}`}
            className="text-foreground text-base font-medium"
          >
            {t("group.members.listTitle", { count: joinedMembers.length })}
          </Text>
        </View>
        {joinedMembers.map((member, index) => (
          <View key={member.id}>
            {index > 0 && <View className="bg-border h-px" />}
            <MemberRow
              member={member}
              className="px-4"
              onPress={
                isAdmin || member.id === me.id
                  ? () => handleMemberPress(member.id)
                  : undefined
              }
            />
          </View>
        ))}
      </View>

      <View className="px-4 py-3">
        <PlaceholderMembers
          groupId={group.data.id}
          title={t("group.placeholders.sectionTitle")}
          onPressMember={handleMemberPress}
        />
      </View>

      {/* Error Alerts for Member Actions */}
      {roleUpdateFailure !== undefined && (
        <View className="px-4 py-2">
          <TimedAlert
            variant="destructive"
            title={t("common.error")}
            description={roleUpdateFailure}
            onDismiss={() => updateMemberRoleMutation.reset()}
          />
        </View>
      )}

      {removeFailure !== undefined && (
        <View className="px-4 py-2">
          <TimedAlert
            variant="destructive"
            title={t("common.error")}
            description={removeFailure}
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
              title={t("group.members.roleUpdated")}
              onDismiss={() => updateMemberRoleMutation.reset()}
            />
          </View>
        )}

      {removeGroupMemberMutation.isSuccess &&
        removeGroupMemberMutation.data.success === true && (
          <View className="px-4 py-2">
            <TimedAlert
              variant="success"
              title={t("group.members.removed")}
              onDismiss={() => removeGroupMemberMutation.reset()}
            />
          </View>
        )}
    </AppScrollView>
  );
}
