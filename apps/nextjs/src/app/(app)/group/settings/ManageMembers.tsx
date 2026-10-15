"use client";

import type { GroupMemberWithUser } from "@flatsby/validators/group";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { InviteDialog } from "./InviteDialog";

interface ManageMembersProps {
  groupId: number;
}

const ManageMembers = ({ groupId }: ManageMembersProps) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const handleApiError = useHandleApiError();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  if (!group.success) {
    return handleApiError(group.error);
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="group-manage-members-title">
          {t("group.members.title")}
        </CardTitle>
        <CardDescription>{t("group.members.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {isAdmin && (
            <InviteDialog groupId={groupId} groupName={group.data.name} />
          )}
          <div className="grid gap-4">
            {group.data.groupMembers.map((groupMember) => (
              <MemberCard
                key={groupMember.id}
                groupMember={{ ...groupMember, groupId: group.data.id }}
                currentUserGroupMember={{
                  ...group.data.thisGroupMember,
                  groupId: group.data.id,
                }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MemberCard = ({
  groupMember,
  currentUserGroupMember,
}: {
  groupMember: GroupMemberWithUser;
  currentUserGroupMember: GroupMemberWithUser;
}) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isUserAdmin = groupMember.role === "admin";
  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const updateMemberRoleMutation = useMutation(
    trpc.group.updateMemberRole.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: groupMember.groupId,
          }),
        );
      },
    }),
  );
  const router = useRouter();
  const removeGroupMemberMutation = useMutation(
    trpc.group.removeGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({
            id: groupMember.groupId,
          }),
        );
        void queryClient.invalidateQueries(
          trpc.invite.get.queryFilter({ groupId: groupMember.groupId }),
        );
        if (groupMember.id === currentUserGroupMember.id) {
          void queryClient.invalidateQueries(
            trpc.group.getUserGroups.queryOptions(),
          );
          router.push(`/group`);
        }
      },
    }),
  );

  return (
    <div id="manage-members" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex w-full max-w-[250px] items-center gap-4">
          <Avatar>
            <AvatarImage
              alt={t("group.members.avatarAlt")}
              src={groupMember.user.image ?? undefined}
            />
            <AvatarFallback>
              {groupMember.user.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
        {(isCurrentUserAdmin || isCurrentUser) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <div className="bg-card flex w-full max-w-md flex-col gap-4 rounded-lg p-6">
                {isCurrentUserAdmin && (
                  <>
                    <div className="text-sm font-semibold">
                      {t("group.members.editRole", {
                        name: groupMember.user.name ?? "",
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
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() =>
                    removeGroupMemberMutation.mutate({
                      memberId: groupMember.id,
                    })
                  }
                >
                  {isCurrentUser
                    ? t("group.members.leaveGroup")
                    : t("common.remove")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {(removeGroupMemberMutation.isError ||
        removeGroupMemberMutation.data?.success === false) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {removeGroupMemberMutation.data?.success === false
              ? removeGroupMemberMutation.data.error.type
              : (removeGroupMemberMutation.error?.data?.code ??
                t("common.error"))}
          </AlertTitle>
          <AlertDescription>
            {removeGroupMemberMutation.data?.success === false
              ? removeGroupMemberMutation.data.error.message
              : (removeGroupMemberMutation.error?.message ??
                t("group.members.removeFailed"))}
          </AlertDescription>
        </Alert>
      )}
      {removeGroupMemberMutation.isSuccess &&
        removeGroupMemberMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("group.members.removed")}</AlertTitle>
          </Alert>
        )}
      {(updateMemberRoleMutation.isError ||
        updateMemberRoleMutation.data?.success === false) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {updateMemberRoleMutation.data?.success === false
              ? updateMemberRoleMutation.data.error.type
              : (updateMemberRoleMutation.error?.data?.code ??
                t("common.error"))}
          </AlertTitle>
          <AlertDescription>
            {updateMemberRoleMutation.data?.success === false
              ? updateMemberRoleMutation.data.error.message
              : (updateMemberRoleMutation.error?.message ??
                t("group.members.roleUpdateFailed"))}
          </AlertDescription>
        </Alert>
      )}
      {updateMemberRoleMutation.isSuccess &&
        updateMemberRoleMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("group.members.roleUpdated")}</AlertTitle>
          </Alert>
        )}
    </div>
  );
};

export default ManageMembers;
