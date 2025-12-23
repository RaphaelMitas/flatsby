"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { LoaderCircle, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
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

export default function DangerZone({ groupId }: { groupId: number }) {
  const [groupNameInput, setGroupNameInput] = useState("");
  const router = useRouter();
  const trpc = useTRPC();
  const { data: group } = useSuspenseQuery(
    trpc.shoppingList.getGroup.queryOptions({ id: groupId }),
  );
  const deleteGroupMutation = useMutation(
    trpc.shoppingList.deleteGroup.mutationOptions({
      onSuccess: () => {
        router.push("/group");
      },
    }),
  );

  if (!group.success) {
    return handleApiError(group.error);
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";

  return (
    <Card className="w-full">
      <CardHeader className="w-full">
        <CardTitle>Delete Group</CardTitle>
        <CardDescription>This action cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlertIcon className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              Deleting this group will permanently remove it and all its data.
              Please type the name of the group below to confirm.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <div className="flex flex-col gap-4 md:flex-row">
              <Input
                id="delete-group-name-input"
                placeholder="Enter group name"
                maxLength={256}
                value={groupNameInput}
                disabled={!isAdmin}
                onChange={(e) => setGroupNameInput(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={
                  groupNameInput !== group.data.name ||
                  deleteGroupMutation.isPending ||
                  !isAdmin
                }
                className="w-full min-w-37.5 md:w-fit"
                onClick={() => deleteGroupMutation.mutate({ id: groupId })}
              >
                {!isAdmin ? (
                  "not an admin"
                ) : deleteGroupMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete Group"
                )}
              </Button>
            </div>
            {(deleteGroupMutation.isError ||
              deleteGroupMutation.data?.success === false) && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>
                  {deleteGroupMutation.data?.success === false
                    ? deleteGroupMutation.data.error.type
                    : (deleteGroupMutation.error?.data?.code ??
                      "Unknown error")}
                </AlertTitle>
                <AlertDescription>
                  {deleteGroupMutation.data?.success === false
                    ? deleteGroupMutation.data.error.message
                    : (deleteGroupMutation.error?.message ??
                      "unknown error during group deletion")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
