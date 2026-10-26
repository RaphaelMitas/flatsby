"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { LoaderCircle, TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
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

interface DangerZoneProps {
  groupId: number;
}

export default function DangerZone({ groupId }: DangerZoneProps) {
  const t = useTranslations();
  const [groupNameInput, setGroupNameInput] = useState("");
  const router = useRouter();
  const trpc = useTRPC();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );
  const deleteGroupMutation = useMutation(
    trpc.group.deleteGroup.mutationOptions({
      onSuccess: (data) => {
        if (data.success) router.push("/group");
      },
    }),
  );

  if (!group.success) {
    return null;
  }

  const isAdmin = group.data.thisGroupMember.role === "admin";
  const deleteFailure = failureOf(
    deleteGroupMutation,
    t("group.delete.failed"),
  );

  return (
    <Card className="w-full">
      <CardHeader className="w-full">
        <CardTitle>{t("group.delete.title")}</CardTitle>
        <CardDescription>{t("group.delete.cannotBeUndone")}</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlertIcon className="h-4 w-4" />
            <AlertTitle data-testid="group-danger-zone-title">
              {t("navigation.dangerZone")}
            </AlertTitle>
            <AlertDescription>{t("group.delete.warning")}</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="group-name">{t("group.nameLabel")}</Label>
            <div className="flex flex-col gap-4 md:flex-row">
              <Input
                id="delete-group-name-input"
                data-testid="group-delete-name-input"
                placeholder={t("group.namePlaceholder")}
                maxLength={256}
                value={groupNameInput}
                disabled={!isAdmin}
                onChange={(e) => setGroupNameInput(e.target.value)}
              />
              <Button
                variant="destructive"
                data-testid="group-delete-confirm-button"
                disabled={
                  groupNameInput !== group.data.name ||
                  deleteGroupMutation.isPending ||
                  !isAdmin
                }
                className="w-full min-w-37.5 md:w-fit"
                onClick={() => deleteGroupMutation.mutate({ id: groupId })}
              >
                {!isAdmin ? (
                  t("group.details.notAdminLowercase")
                ) : deleteGroupMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  t("group.delete.title")
                )}
              </Button>
            </div>
            {deleteFailure && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>{t("common.error")}</AlertTitle>
                <AlertDescription>{deleteFailure}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
