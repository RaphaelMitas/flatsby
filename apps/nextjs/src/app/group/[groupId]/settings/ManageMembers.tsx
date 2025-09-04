"use client";

import type { groupMembers } from "@flatsby/db/schema";
import React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

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

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

type groupMemberWithUser = typeof groupMembers.$inferSelect & {
  user: {
    email: string;
    name: string | null;
    image: string | null;
  };
};

const addMemberFormSchema = z.object({
  email: z
    .string()
    .min(1, {
      message: "Email is required",
    })
    .email({
      message: "Please enter a valid email address",
    }),
});

const ManageMembers = ({ groupId }: { groupId: number }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: group } = useSuspenseQuery(
    trpc.shoppingList.getGroup.queryOptions({ groupId }),
  );

  const form = useForm<z.infer<typeof addMemberFormSchema>>({
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
    trpc.shoppingList.addGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          onAddGroupMemberError(data.error.message);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getGroup.queryOptions({ groupId }),
        );
        form.reset();
      },
      onError: (err) => {
        onAddGroupMemberError(err.message);
      },
    }),
  );

  const handleSubmit = (values: z.infer<typeof addMemberFormSchema>) => {
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
        <CardTitle>Manage Members</CardTitle>
        <CardDescription>
          Add new members and update their roles.
        </CardDescription>
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
                        placeholder={
                          isAdmin
                            ? "Enter email"
                            : "Only admins can add members"
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
                type="submit"
                className="w-full min-w-[150px] md:w-fit"
                disabled={!isAdmin || addGroupMemberMutation.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                {addGroupMemberMutation.isPending ? "Adding..." : "Add member"}
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
                    : (addGroupMemberMutation.error?.data?.code ?? "Error")}
                </AlertTitle>
                <AlertDescription>
                  {addGroupMemberMutation.data?.success === false
                    ? addGroupMemberMutation.data.error.message
                    : (addGroupMemberMutation.error?.message ??
                      "Unknown error during member addition")}
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
  groupMember: groupMemberWithUser;
  currentUserGroupMember: groupMemberWithUser;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isUserAdmin = groupMember.role === "admin";
  const isCurrentUser = groupMember.id === currentUserGroupMember.id;
  const isCurrentUserAdmin = currentUserGroupMember.role === "admin";
  const updateMemberRoleMutation = useMutation(
    trpc.shoppingList.updateMemberRole.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getGroup.queryOptions({
            groupId: groupMember.groupId,
          }),
        );
      },
    }),
  );
  const router = useRouter();
  const removeGroupMemberMutation = useMutation(
    trpc.shoppingList.removeGroupMember.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getGroup.queryOptions({
            groupId: groupMember.groupId,
          }),
        );
        if (groupMember.id === currentUserGroupMember.id) {
          void queryClient.invalidateQueries(
            trpc.shoppingList.getUserGroups.queryOptions(),
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
              alt="Member Avatar"
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
              <div className="inline-block text-sm text-muted-foreground">
                {isUserAdmin && "(admin)"}
              </div>
            </div>
            <div className="truncate text-sm text-muted-foreground">
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
              <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-card p-6">
                {isCurrentUserAdmin && (
                  <>
                    <div className="text-sm font-semibold">
                      {`Edit ${groupMember.user.name}'s role:`}
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
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
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
                  {isCurrentUser ? "Leave Group" : "Remove"}
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
              : (removeGroupMemberMutation.error?.data?.code ?? "Error")}
          </AlertTitle>
          <AlertDescription>
            {removeGroupMemberMutation.data?.success === false
              ? removeGroupMemberMutation.data.error.message
              : (removeGroupMemberMutation.error?.message ??
                "Unknown error during member removal")}
          </AlertDescription>
        </Alert>
      )}
      {removeGroupMemberMutation.isSuccess &&
        removeGroupMemberMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Member removed successfully!</AlertTitle>
          </Alert>
        )}
      {(updateMemberRoleMutation.isError ||
        updateMemberRoleMutation.data?.success === false) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {updateMemberRoleMutation.data?.success === false
              ? updateMemberRoleMutation.data.error.type
              : (updateMemberRoleMutation.error?.data?.code ?? "Error")}
          </AlertTitle>
          <AlertDescription>
            {updateMemberRoleMutation.data?.success === false
              ? updateMemberRoleMutation.data.error.message
              : (updateMemberRoleMutation.error?.message ??
                "Unknown error during role update")}
          </AlertDescription>
        </Alert>
      )}
      {updateMemberRoleMutation.isSuccess &&
        updateMemberRoleMutation.data.success === true && (
          <Alert variant="success">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Role updated successfully!</AlertTitle>
          </Alert>
        )}
    </div>
  );
};

export default ManageMembers;
