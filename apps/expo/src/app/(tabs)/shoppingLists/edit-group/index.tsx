import type { ApiResult, GroupWithMemberCount } from "@flatsby/api";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import DeleteConfirmationModal from "~/components/DeleteConfirmationModal";
import {
  SettingsHeader,
  SettingsItem,
  SettingsSection,
} from "~/components/settings";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function GroupSettingsIndex() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId } = useShoppingStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: group } = useSuspenseQuery(
    trpc.shoppingList.getGroup.queryOptions({
      groupId: Number(selectedGroupId) || 0,
    }),
  );

  const onDeleteGroupError = (
    previousGroups: ApiResult<GroupWithMemberCount[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getUserGroups.queryKey(),
      previousGroups,
    );
  };

  const deleteGroupMutation = useMutation(
    trpc.shoppingList.deleteGroup.mutationOptions({
      onMutate: () => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getUserGroups.queryOptions(),
        );

        const previousGroups = queryClient.getQueryData(
          trpc.shoppingList.getUserGroups.queryKey(),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getUserGroups.queryKey(),
          (old) => {
            if (!old?.success) return old;
            return {
              ...old,
              data: old.data.filter((g) => g.id !== Number(selectedGroupId)),
            };
          },
        );
        router.back();

        return { previousGroups };
      },
      onSuccess: (data, variables, context) => {
        if (!data.success) {
          onDeleteGroupError(context.previousGroups);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getUserGroups.queryOptions(),
        );
      },
      onError: (error, variables, context) => {
        onDeleteGroupError(context?.previousGroups);
      },
    }),
  );

  const handleDeleteGroup = () => {
    setShowDeleteModal(false);
    deleteGroupMutation.mutate({ groupId: Number(selectedGroupId) });
    router.replace("/groups");
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <SettingsHeader title={group.data.name} />

        <SettingsSection title={group.data.name}>
          <SettingsItem
            title="Group Details"
            subtitle="Edit your group details"
            iconName="settings"
            onPress={() =>
              router.push("/shoppingLists/edit-group/group-details")
            }
          />
          <SettingsItem
            title="Members"
            subtitle="Manage your group members"
            iconName="users"
            onPress={() => router.push("/shoppingLists/edit-group/members")}
          />
        </SettingsSection>

        <SettingsSection title="Change Group">
          <SettingsItem
            title="Change Group"
            subtitle="Change selected group or create a new one"
            iconName="arrow-left-right"
            onPress={() => {
              router.back();
              router.push("/groups");
            }}
          />
        </SettingsSection>
        <SettingsSection title="Danger Zone">
          <SettingsItem
            title="Delete Group"
            subtitle="Permanently delete your account"
            iconName="trash-2"
            onPress={() => setShowDeleteModal(true)}
            variant="destructive"
          />
        </SettingsSection>
      </ScrollView>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteGroup}
        itemName={group.data.name}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.data.name}"? This action cannot be undone and will permanently remove all data associated with this group.`}
        confirmationLabel={`To confirm deletion, please type the group name: ${group.data.name}`}
      />
    </SafeAreaView>
  );
}
