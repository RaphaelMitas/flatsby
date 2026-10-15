import type { ApiResult, GroupWithMemberCount } from "@flatsby/api";
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import DeleteConfirmationModal from "~/components/DeleteConfirmationModal";
import { SettingsHeader } from "~/components/settings/SettingsHeader";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { SafeAreaView } from "~/lib/ui/safe-area";
import { handleApiError } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";

export default function GroupSettingsIndex() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedGroupId, clearSelectedGroup } = useShoppingStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({
      id: Number(selectedGroupId) || 0,
    }),
  );

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
            success: true as const,
            data: old.data.filter((g) => g.id !== Number(selectedGroupId)),
          };
        });
        router.back();

        return { previousGroups };
      },
      onSuccess: (data, _variables, context) => {
        if (!data.success) {
          onDeleteGroupError(context.previousGroups);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
      },
      onError: (_error, _variables, context) => {
        onDeleteGroupError(context?.previousGroups);
      },
    }),
  );

  const handleDeleteGroup = () => {
    setShowDeleteModal(false);
    deleteGroupMutation.mutate({ id: Number(selectedGroupId) });
    clearSelectedGroup();
    router.dismissAll();
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  if (!group.success) {
    return handleApiError({ router, error: group.error });
  }

  return (
    <SafeAreaView>
      <AppScrollView>
        <SettingsHeader title={group.data.name} />

        <SettingsSection title={group.data.name}>
          <Link href="/(tabs)/settings/group-settings/group-details" asChild>
            <SettingsItem
              testID="group-settings-details"
              title={t("group.settings.details")}
              subtitle={t("group.settings.detailsSubtitle")}
              iconName="settings"
            />
          </Link>
          <Link href="/(tabs)/settings/group-settings/members" asChild>
            <SettingsItem
              testID="group-settings-members"
              title={t("group.settings.members")}
              subtitle={t("group.settings.membersSubtitle")}
              iconName="users"
            />
          </Link>
          <Link href="/(tabs)/settings/group-settings/expenses" asChild>
            <SettingsItem
              testID="group-settings-expenses"
              title={t("group.expenseSettings.title")}
              subtitle={t("group.expenseSettings.subtitle")}
              iconName="wallet"
            />
          </Link>
          <Link href="/(tabs)/home/shopping-lists" asChild>
            <SettingsItem
              title={t("group.settings.selectShoppingList")}
              subtitle={t("group.settings.selectShoppingListSubtitle")}
              iconName="shopping-cart"
            />
          </Link>
          <Link href="/(tabs)/settings/group-settings/import-expenses" asChild>
            <SettingsItem
              title={t("group.settings.importExpenses")}
              subtitle={t("group.settings.importExpensesSubtitle")}
              iconName="upload"
            />
          </Link>
        </SettingsSection>

        <SettingsSection title={t("group.settings.changeGroup")}>
          <Link href="/settings/manage-groups" asChild>
            <SettingsItem
              title={t("group.settings.changeGroup")}
              subtitle={t("group.settings.changeGroupSubtitle")}
              iconName="arrow-left-right"
            />
          </Link>
        </SettingsSection>
        <SettingsSection title={t("navigation.dangerZone")}>
          <SettingsItem
            testID="group-settings-delete"
            title={t("group.delete.title")}
            subtitle={t("group.delete.subtitle")}
            iconName="trash-2"
            onPress={() => setShowDeleteModal(true)}
            variant="destructive"
          />
        </SettingsSection>
      </AppScrollView>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteGroup}
        itemName={group.data.name}
        title={t("group.delete.title")}
        description={t("group.delete.description", { name: group.data.name })}
        confirmationLabel={t("group.delete.confirmationLabel", {
          name: group.data.name,
        })}
        needsConfirmationInput
      />
    </SafeAreaView>
  );
}
