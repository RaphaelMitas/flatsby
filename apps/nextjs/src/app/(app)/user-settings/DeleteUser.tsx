"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { LoaderCircle, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

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

import { signOutAndRedirect } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export default function DeleteUser() {
  const t = useTranslations();
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
        await signOutAndRedirect(router);
      },
    }),
  );

  const handleDeleteUser = () => {
    deleteUserMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader className="w-full">
        <CardTitle>{t("settings.danger.deleteUser")}</CardTitle>
        <CardDescription>{t("settings.danger.cannotBeUndone")}</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlertIcon className="h-4 w-4" />
            <AlertTitle data-testid="delete-user-danger-zone-title">
              {t("navigation.dangerZone")}
            </AlertTitle>
            <AlertDescription>
              {t.rich("settings.danger.deleteUserWarning", {
                email: user.email,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <div className="flex flex-col gap-4 md:flex-row">
              {deleteUserOpen && (
                <>
                  <Input
                    id="delete-user-name-input"
                    data-testid="delete-user-email-input"
                    placeholder={t("settings.profile.userNamePlaceholder")}
                    maxLength={256}
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                  />
                  <Button
                    className="w-full min-w-[150px] md:w-fit"
                    data-testid="delete-user-cancel-button"
                    onClick={() => setDeleteUserOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                </>
              )}
              <Button
                variant="destructive"
                data-testid="delete-user-confirm-button"
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
                  t("settings.danger.deleteUser")
                )}
              </Button>
            </div>
            {(deleteUserMutation.isError ||
              (deleteUserMutation.data &&
                !deleteUserMutation.data.success)) && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>{t("settings.danger.deletionFailed")}</AlertTitle>
                <AlertDescription>
                  {deleteUserMutation.isError
                    ? deleteUserMutation.error.message
                    : !deleteUserMutation.data.success
                      ? deleteUserMutation.data.error.message
                      : t("settings.danger.unknownError")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
