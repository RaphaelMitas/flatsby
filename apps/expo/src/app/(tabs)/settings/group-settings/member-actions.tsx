import type {
  RemoveGroupMemberInput,
  UpdateMemberRoleInput,
} from "@flatsby/validators/group";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  groupMembersMutation,
  groupMembersPatches,
} from "@flatsby/api/groupMembersCache";
import { memberPerson } from "@flatsby/validators/expenses/formatting";
import { isPlaceholder } from "@flatsby/validators/group";

import { MemberAvatar } from "~/components/expenses/MemberAvatar";
import { useShareInvite } from "~/components/invite/useShareInvite";
import { PlaceholderNameField } from "~/components/members/PlaceholderNameField";
import { Button } from "~/lib/ui/button";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

// Global state for communication between screens
let memberActionCallback: {
  onUpdateRole?: ({ memberId, newRole }: UpdateMemberRoleInput) => void;
  onRemoveMember?: ({ memberId }: RemoveGroupMemberInput) => void;
} = {};

export const setMemberActionCallbacks = (
  callbacks: typeof memberActionCallback,
) => {
  memberActionCallback = callbacks;
};

export default function MemberActionsScreen() {
  const t = useTranslations();
  const { selectedGroupId } = useShoppingStore();
  const { memberId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const shareInvite = useShareInvite();
  const [renaming, setRenaming] = useState(false);

  const groupKey = trpc.group.getGroup.queryKey({
    id: Number(selectedGroupId) || 0,
  });
  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

  const alertFailure = (message: string | undefined) =>
    Alert.alert(t("common.error"), message ?? t("errors.unexpected"));
  // These embed member names, so they go stale when a member changes identity
  const memberNameQueries = [
    trpc.expense.pathFilter(),
    trpc.calendar.pathFilter(),
    trpc.shoppingList.getShoppingList.pathFilter(),
    trpc.group.getRecentActivity.pathFilter(),
  ];
  const renameMutation = useMutation(
    trpc.group.renamePlaceholder.mutationOptions(
      groupMembersMutation(queryClient, groupKey, groupMembersPatches.renamed, {
        onFailure: alertFailure,
        invalidate: memberNameQueries,
      }),
    ),
  );
  const undoClaimMutation = useMutation(
    trpc.group.undoClaim.mutationOptions(
      groupMembersMutation(
        queryClient,
        groupKey,
        groupMembersPatches.claimUndone,
        {
          onFailure: alertFailure,
          invalidate: [
            ...memberNameQueries,
            trpc.group.getUserGroups.queryFilter(),
          ],
        },
      ),
    ),
  );

  if (!group.success) {
    return null;
  }

  const groupMember = group.data.groupMembers.find(
    (member) => member.id === Number(memberId),
  );
  const currentUserGroupMember = group.data.thisGroupMember;

  if (!groupMember) {
    router.back();
    return null;
  }

  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const isUserAdmin = groupMember.role === "admin";
  const placeholder = isPlaceholder(groupMember);
  const claimedFrom = placeholder ? null : groupMember.placeholderName;

  const handleUpdateRole = (newRole: "admin" | "member") => {
    if (memberActionCallback.onUpdateRole) {
      memberActionCallback.onUpdateRole({ memberId: groupMember.id, newRole });
    }
    router.back();
  };

  const handleRemoveMember = () => {
    if (memberActionCallback.onRemoveMember) {
      memberActionCallback.onRemoveMember({ memberId: groupMember.id });
    }
    router.back();
  };

  const handleRename = (name: string) => {
    if (name !== groupMember.user.name) {
      renameMutation.mutate({ memberId: groupMember.id, name });
    }
    router.back();
  };

  const handleUndoClaim = (name: string) =>
    Alert.alert(
      t("group.placeholders.undoClaim", { name }),
      t("group.placeholders.undoClaimHint", {
        user: groupMember.user.name,
        name,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("group.placeholders.undoClaim", { name }),
          style: "destructive",
          onPress: () => {
            undoClaimMutation.mutate({ memberId: groupMember.id });
            router.back();
          },
        },
      ],
    );

  return (
    <View className="bg-background flex-1 p-6">
      <View className="mb-6 flex-row items-center gap-3">
        <MemberAvatar person={memberPerson(groupMember)} />
        <View className="flex-1">
          <Text className="text-foreground text-lg font-semibold">
            {groupMember.user.name}
          </Text>
          {claimedFrom !== null ? (
            <Text className="text-muted-foreground text-sm">
              {t("group.placeholders.claimedFrom", { name: claimedFrom })}
            </Text>
          ) : (
            groupMember.user.email !== null && (
              <Text className="text-muted-foreground text-sm">
                {groupMember.user.email}
              </Text>
            )
          )}
        </View>
      </View>

      {placeholder && (
        <View className="mb-6 gap-3">
          {isCurrentUserAdmin && (
            <Button
              testID="member-action-invite"
              title={t("group.placeholders.invite", {
                name: groupMember.user.name,
              })}
              icon="share"
              variant="outline"
              onPress={shareInvite}
            />
          )}
          {renaming ? (
            <>
              <Text className="text-foreground text-sm font-medium">
                {t("group.placeholders.renameTitle", {
                  name: groupMember.user.name,
                })}
              </Text>
              <PlaceholderNameField
                defaultName={groupMember.user.name}
                submitLabel={t("group.placeholders.save")}
                inputTestID="member-rename-input"
                buttonTestID="member-rename-save"
                autoFocus
                onSubmit={handleRename}
              />
            </>
          ) : (
            <Button
              testID="member-action-rename"
              title={t("group.placeholders.rename")}
              icon="pencil"
              variant="outline"
              onPress={() => setRenaming(true)}
            />
          )}
        </View>
      )}

      {isCurrentUserAdmin && !placeholder && (
        <View className="mb-6 gap-3">
          <Text className="text-foreground text-sm font-medium">
            {t("group.members.changeRole")}
          </Text>
          <View className="flex-row gap-2">
            <Button
              title={t("group.members.roles.admin")}
              variant={isUserAdmin ? "primary" : "outline"}
              className="flex-1"
              onPress={() => handleUpdateRole("admin")}
            />
            <Button
              title={t("group.members.roles.member")}
              variant={!isUserAdmin ? "primary" : "outline"}
              className="flex-1"
              onPress={() => handleUpdateRole("member")}
            />
          </View>
          {claimedFrom !== null && !isUserAdmin && (
            <Button
              testID="member-action-undo-claim"
              title={t("group.placeholders.undoClaim", { name: claimedFrom })}
              icon="undo-2"
              variant="outline"
              onPress={() => handleUndoClaim(claimedFrom)}
            />
          )}
        </View>
      )}

      {(isCurrentUser || isCurrentUserAdmin) && (
        <>
          <Text className="text-foreground mb-6 text-sm font-medium">
            {t("group.members.manageMember")}
          </Text>
          <View className="flex-row gap-3">
            <Button
              title={t("common.cancel")}
              variant="outline"
              className="flex-1"
              onPress={() => router.back()}
            />
            <Button
              title={
                isCurrentUser
                  ? t("group.members.leaveGroup")
                  : t("common.remove")
              }
              variant="destructive"
              className="flex-1"
              icon="trash-2"
              onPress={handleRemoveMember}
            />
          </View>
        </>
      )}
    </View>
  );
}
