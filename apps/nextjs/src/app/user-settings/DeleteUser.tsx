"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
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

import { signOut } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export default function DeleteUser() {
  const [userNameInput, setUserNameInput] = useState("");
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: user } = useSuspenseQuery(
    trpc.user.getCurrentUser.queryOptions(),
  );
  const router = useRouter();

  const deleteUserMutation = useMutation(
    trpc.user.deleteUser.mutationOptions({
      onSuccess: async (data) => {
        if (!data.success) {
          return;
        }

        queryClient.clear();
        await signOut();
        router.push("auth/login");
      },
    }),
  );

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader className="w-full">
        <CardTitle>Delete User</CardTitle>
        <CardDescription>This action cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlertIcon className="h-4 w-4" />
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              Deleting this user will permanently remove it and all its data.
              Please type your email <strong>{user.email}</strong> below to
              confirm. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <div className="flex flex-col gap-4 md:flex-row">
              {deleteUserOpen && (
                <>
                  <Input
                    id="delete-user-name-input"
                    placeholder="Enter user name"
                    maxLength={256}
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                  />
                  <Button
                    className="w-full min-w-[150px] md:w-fit"
                    onClick={() => setDeleteUserOpen(false)}
                  >
                    Cancel
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                disabled={
                  !deleteUserOpen
                    ? false
                    : deleteUserMutation.isPending ||
                      userNameInput !== user.email
                }
                className="w-full min-w-[150px] md:w-fit"
                onClick={
                  deleteUserOpen
                    ? handleDeleteUser
                    : () => setDeleteUserOpen(true)
                }
              >
                {deleteUserMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete User"
                )}
              </Button>
            </div>
            {(deleteUserMutation.isError ||
              (deleteUserMutation.data &&
                !deleteUserMutation.data.success)) && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>Deletion Failed</AlertTitle>
                <AlertDescription>
                  {deleteUserMutation.isError
                    ? deleteUserMutation.error.message
                    : !deleteUserMutation.data.success
                      ? deleteUserMutation.data.error.message
                      : "An unknown error occurred"}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
