"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  groupMembersMutation,
  groupMembersPatches,
} from "@flatsby/api/groupMembersCache";
import { failureOf } from "@flatsby/api/resultMutation";
import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@flatsby/ui/alert-dialog";
import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@flatsby/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { toast } from "@flatsby/ui/toast";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { isPlaceholder } from "@flatsby/validators/group";

import { useTRPC } from "~/trpc/react";
import { PlaceholderNameForm } from "./PlaceholderNameForm";

export const MemberCard = ({
  groupId,
  groupMember,
  currentUserGroupMember,
}: {
  groupId: number;
  groupMember: GroupMemberWithUserInfo;
  currentUserGroupMember: GroupMemberWithUserInfo;
}) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const isUserAdmin = groupMember.role === "admin";
  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const placeholder = isPlaceholder(groupMember);
  const claimedFrom = placeholder ? null : groupMember.placeholderName;
  // Optimistic rows carry negative ids until the server has created them
  const isSaved = groupMember.id > 0;
  const groupKey = trpc.group.getGroup.queryKey({ id: groupId });
  const toastFailure = (message: string | undefined) =>
    toast.error(t("common.error"), {
      description: message ?? t("errors.unexpected"),
    });
  // Expenses embed member names, so they go stale when a member changes identity
  const invalidateExpenses = () =>
    void queryClient.invalidateQueries(trpc.expense.pathFilter());

  const updateMemberRoleMutation = useMutation(
    trpc.group.updateMemberRole.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries({ queryKey: groupKey });
      },
    }),
  );
  const removeGroupMemberMutation = useMutation(
    trpc.group.removeGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries({ queryKey: groupKey });
        void queryClient.invalidateQueries(
          trpc.invite.get.queryFilter({ groupId }),
        );
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryOptions(),
        );
        if (isCurrentUser) {
          router.push(`/group`);
        }
      },
    }),
  );
  const renameMutation = useMutation(
    trpc.group.renamePlaceholder.mutationOptions(
      groupMembersMutation(queryClient, groupKey, groupMembersPatches.renamed, {
        onFailure: toastFailure,
        onSuccess: invalidateExpenses,
      }),
    ),
  );
  const undoClaimMutation = useMutation(
    trpc.group.undoClaim.mutationOptions(
      groupMembersMutation(
        queryClient,
        groupKey,
        groupMembersPatches.claimUndone,
        { onFailure: toastFailure, onSuccess: invalidateExpenses },
      ),
    ),
  );
  const removeFailure = failureOf(
    removeGroupMemberMutation,
    t("group.members.removeFailed"),
  );
  const roleUpdateFailure = failureOf(
    updateMemberRoleMutation,
    t("group.members.roleUpdateFailed"),
  );

  const canRemove = isCurrentUserAdmin || isCurrentUser;
  const hasActions = isSaved && (placeholder || canRemove);
  const removeButton = canRemove && (
    <Button
      className="w-full"
      variant="destructive"
      onClick={() =>
        removeGroupMemberMutation.mutate({
          memberId: groupMember.id,
        })
      }
    >
      {isCurrentUser ? t("group.members.leaveGroup") : t("common.remove")}
    </Button>
  );

  return (
    <div
      id="manage-members"
      className="flex flex-col gap-4"
      data-testid={
        placeholder ? `placeholder-row-${groupMember.user.name}` : undefined
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex w-full max-w-64 items-center gap-4">
          <UserAvatar
            name={groupMember.user.name}
            image={groupMember.user.image}
            placeholder={placeholder}
            size="lg"
          />
          <div className="w-full pr-2">
            <div className="flex items-center gap-2 truncate font-medium">
              <div className="inline truncate font-medium">
                {groupMember.user.name}
              </div>
              <div className="text-muted-foreground inline-block text-sm">
                {isUserAdmin && t("group.members.adminBadgeLowercase")}
              </div>
            </div>
            <div className="text-muted-foreground truncate text-sm">
              {groupMember.user.email}
            </div>
          </div>
        </div>
        {hasActions && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <div className="bg-card flex w-full max-w-md flex-col gap-4 rounded-lg p-6">
                {placeholder ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    data-testid="member-action-rename"
                    onClick={() => setRenaming(true)}
                  >
                    {t("group.placeholders.rename")}
                  </Button>
                ) : (
                  <>
                    {claimedFrom !== null && (
                      <p className="text-muted-foreground text-sm">
                        {t("group.placeholders.claimedFrom", {
                          name: claimedFrom,
                        })}
                      </p>
                    )}
                    {isCurrentUserAdmin && (
                      <>
                        <div className="text-sm font-semibold">
                          {t("group.members.editRole", {
                            name: groupMember.user.name,
                          })}
                        </div>
                        <Select
                          defaultValue={groupMember.role}
                          onValueChange={(newRole: "admin" | "member") =>
                            updateMemberRoleMutation.mutate({
                              memberId: groupMember.id,
                              newRole,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={t("group.members.selectRole")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              {t("group.members.roles.admin")}
                            </SelectItem>
                            <SelectItem value="member">
                              {t("group.members.roles.member")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {isCurrentUserAdmin &&
                      claimedFrom !== null &&
                      !isUserAdmin && (
                        <Button
                          className="h-auto w-full whitespace-normal"
                          variant="outline"
                          data-testid="member-action-undo-claim"
                          onClick={() => setConfirmUndo(true)}
                        >
                          {t("group.placeholders.undoClaim", {
                            name: claimedFrom,
                          })}
                        </Button>
                      )}
                  </>
                )}
                {removeButton}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {removeFailure && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{removeFailure}</AlertDescription>
        </Alert>
      )}
      {removeGroupMemberMutation.isSuccess &&
        removeGroupMemberMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("group.members.removed")}</AlertTitle>
          </Alert>
        )}
      {roleUpdateFailure && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{roleUpdateFailure}</AlertDescription>
        </Alert>
      )}
      {updateMemberRoleMutation.isSuccess &&
        updateMemberRoleMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("group.members.roleUpdated")}</AlertTitle>
          </Alert>
        )}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t("group.placeholders.renameTitle", {
                name: groupMember.user.name,
              })}
            </DialogTitle>
          </DialogHeader>
          <PlaceholderNameForm
            defaultName={groupMember.user.name}
            submitLabel={t("group.placeholders.save")}
            inputTestId="placeholder-rename-input"
            buttonTestId="placeholder-rename-button"
            autoFocus
            onSubmit={(name) => {
              if (name !== groupMember.user.name)
                renameMutation.mutate({ memberId: groupMember.id, name });
              setRenaming(false);
            }}
          />
        </DialogContent>
      </Dialog>
      {claimedFrom !== null && (
        <AlertDialog open={confirmUndo} onOpenChange={setConfirmUndo}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("group.placeholders.undoClaim", { name: claimedFrom })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("group.placeholders.undoClaimHint", {
                  user: groupMember.user.name,
                  name: claimedFrom,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="member-undo-claim-confirm"
                onClick={() =>
                  undoClaimMutation.mutate({ memberId: groupMember.id })
                }
              >
                {t("group.placeholders.undoClaim", { name: claimedFrom })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
