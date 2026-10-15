"use client";

import type {
  AddMemberFormValues,
  GroupMemberWithUser,
} from "@flatsby/validators/group";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

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
import { Form, FormControl, FormField, FormMessage } from "@flatsby/ui/form";
import { Input } from "@flatsby/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { addMemberFormSchema } from "@flatsby/validators/group";

import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";

interface ManageMembersProps {
  groupId: number;
}

const ManageMembers = ({ groupId }: ManageMembersProps) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const handleApiError = useHandleApiError();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onAddGroupMemberError = (errorMessage: string) => {
    form.setError("email", {
      message: errorMessage,
    });
  };

  const addGroupMemberMutation = useMutation(
    trpc.group.addGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onAddGroupMemberError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({ id: groupId }),
        );
        form.reset();
      },
      onError: (err) => {
        onAddGroupMemberError(err.message);
      },
    }),
  );

  const handleSubmit = (values: AddMemberFormValues) => {
    addGroupMemberMutation.mutate({
      groupId,
      memberEmail: values.email,
    });
  };

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
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col items-center gap-4 md:flex-row"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="group-add-member-email"
                        placeholder={
                          isAdmin
                            ? t("group.members.emailPlaceholderShort")
                            : t("group.members.onlyAdminsCanAdd")
                        }
                        type="email"
                        disabled={!isAdmin || addGroupMemberMutation.isPending}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </>
                )}
              />
              <Button
                data-testid="group-add-member-button"
                type="submit"
                className="w-full min-w-37.5 md:w-fit"
                disabled={!isAdmin || addGroupMemberMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addGroupMemberMutation.isPending
                  ? t("group.members.adding")
                  : t("group.members.addMemberShort")}
              </Button>
            </form>
          </Form>
          {(addGroupMemberMutation.isError ||
            addGroupMemberMutation.data?.success === false) &&
            !form.formState.errors.email && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {addGroupMemberMutation.data?.success === false
                    ? addGroupMemberMutation.data.error.type
                    : (addGroupMemberMutation.error?.data?.code ??
                      t("common.error"))}
                </AlertTitle>
                <AlertDescription>
                  {addGroupMemberMutation.data?.success === false
                    ? addGroupMemberMutation.data.error.message
                    : (addGroupMemberMutation.error?.message ??
                      t("group.members.addFailed"))}
                </AlertDescription>
              </Alert>
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
