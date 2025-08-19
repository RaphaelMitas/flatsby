"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  CircleCheckBig,
  LoaderCircle,
  Upload,
} from "lucide-react";

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
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";

import { useTRPC } from "~/trpc/react";
import { handleApiError } from "~/utils";

const GroupDetails = ({ groupId }: { groupId: number }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: group } = useSuspenseQuery(
    trpc.shoppingList.getGroup.queryOptions({ groupId }),
  );
  const [name, setName] = useState(group.success ? group.data.name : "");
  const groupNameMutation = useMutation(
    trpc.shoppingList.changeGroupName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getGroup.queryOptions({ groupId }),
        );
        void queryClient.invalidateQueries(
          trpc.shoppingList.getCurrentUserWithGroups.queryOptions(),
        );
      },
    }),
  );

  if (!group.success) {
    return handleApiError(group.error);
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Details</CardTitle>
        <CardDescription>
          Update your group&apos;s name and profile picture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Group Name</Label>
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <>
                <Input
                  id="name"
                  placeholder="Enter group name"
                  value={name}
                  maxLength={256}
                  disabled={!isAdmin}
                  onChange={(event) => setName(event.target.value)}
                />
                <Button
                  className="w-full min-w-[150px] md:w-fit"
                  disabled={groupNameMutation.isPending || !isAdmin}
                  onClick={() =>
                    groupNameMutation.mutate({ groupId, name: name || "" })
                  }
                >
                  {groupNameMutation.isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : !isAdmin ? (
                    "not an admin"
                  ) : (
                    "Save"
                  )}
                </Button>
              </>
            </div>
            {(groupNameMutation.isError ||
              groupNameMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {groupNameMutation.data?.success === false
                    ? groupNameMutation.data.error.type
                    : (groupNameMutation.error?.data?.code ?? "Unknown error")}
                </AlertTitle>
                <AlertDescription>
                  {groupNameMutation.data?.success === false
                    ? groupNameMutation.data.error.message
                    : (groupNameMutation.error?.message ??
                      "unknown error during name change")}
                </AlertDescription>
              </Alert>
            )}
            {groupNameMutation.isSuccess && groupNameMutation.data.success && (
              <>
                <Alert variant="success">
                  <CircleCheckBig className="h-4 w-4" />
                  <AlertTitle>Name changed successfully!</AlertTitle>
                </Alert>
              </>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-picture">Profile Picture</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage alt="Group Avatar" />
                <AvatarFallback>
                  {group.data.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button disabled variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
              <div className="text-muted-foreground">feature coming soon!</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupDetails;
