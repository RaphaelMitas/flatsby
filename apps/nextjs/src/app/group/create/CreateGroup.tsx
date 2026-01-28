"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";

import { useTRPC } from "~/trpc/react";

/**
 * Component to create a group
 * @param handleSubmit - function to handle form submission (redirects to group)
 * @returns JSX.Element
 * @constructor
 * @module CreateGroup
 * */
export function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const groupMutation = useMutation(
    trpc.group.createGroup.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        router.push("/home");
      },
    }),
  );

  return (
    <div className="p-8">
      <div className="bg-muted mx-auto max-w-md rounded-lg p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Create a Group</h1>
          <p className="mt-2">Enter a name for your new group.</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            groupMutation.mutate({ name: groupName });
          }}
        >
          <div>
            <label
              className="text-muted-foreground mb-2 block text-sm font-medium"
              htmlFor="groupName"
            >
              Group Name
            </label>
            <Input
              id="groupName"
              maxLength={256}
              placeholder="Enter group name"
              onChange={(event) => {
                setGroupName(event.target.value);
              }}
              value={groupName}
              disabled={groupMutation.isPending}
            />
            {groupMutation.isError && (
              <Alert className="mt-2" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{groupMutation.error.data?.code}</AlertTitle>
                <AlertDescription>
                  {groupMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={groupMutation.isPending}
          >
            {groupMutation.isPending ? <LoadingSpinner /> : "Create Group"}
          </Button>
        </form>
      </div>
    </div>
  );
}
