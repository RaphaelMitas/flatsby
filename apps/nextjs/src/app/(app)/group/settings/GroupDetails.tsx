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
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";

import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";

interface GroupDetailsProps {
  groupId: number;
}

const GroupDetails = ({ groupId }: GroupDetailsProps) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const handleApiError = useHandleApiError();

  const { data: group } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: groupId }),
  );

  const groupName = group.success ? group.data.name : "";
  const [name, setName] = useState(groupName);
  const [prevGroupId, setPrevGroupId] = useState(groupId);

  if (groupId !== prevGroupId) {
    setName(groupName);
    setPrevGroupId(groupId);
  }

  const groupNameMutation = useMutation(
    trpc.group.changeGroupName.mutationOptions({
      onSuccess: (data) => {
        if (!data.success) {
          return;
        }

        void queryClient.invalidateQueries(
          trpc.group.getGroup.queryOptions({ id: groupId }),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
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
        <CardTitle>{t("group.settings.details")}</CardTitle>
        <CardDescription>{t("group.details.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("group.nameLabel")}</Label>
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <Input
                id="name"
                data-testid="group-name-input"
                placeholder={t("group.namePlaceholder")}
                value={name}
                maxLength={256}
                disabled={!isAdmin}
                onChange={(event) => setName(event.target.value)}
              />
              <Button
                className="w-full min-w-[150px] md:w-fit"
                data-testid="group-name-save"
                disabled={groupNameMutation.isPending || !isAdmin}
                onClick={() =>
                  groupNameMutation.mutate({ id: groupId, name: name || "" })
                }
              >
                {groupNameMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : !isAdmin ? (
                  t("group.details.notAdminLowercase")
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
            {(groupNameMutation.isError ||
              groupNameMutation.data?.success === false) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {groupNameMutation.data?.success === false
                    ? groupNameMutation.data.error.type
                    : (groupNameMutation.error?.data?.code ??
                      t("common.unknownError"))}
                </AlertTitle>
                <AlertDescription>
                  {groupNameMutation.data?.success === false
                    ? groupNameMutation.data.error.message
                    : (groupNameMutation.error?.message ??
                      t("group.details.renameFailed"))}
                </AlertDescription>
              </Alert>
            )}
            {groupNameMutation.isSuccess && groupNameMutation.data.success && (
              <Alert variant="success">
                <CircleCheckBig className="h-4 w-4" />
                <AlertTitle>{t("group.details.nameChanged")}</AlertTitle>
              </Alert>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-picture">
              {t("group.details.profilePicture")}
            </Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage alt={t("group.avatarAlt")} />
                <AvatarFallback>
                  {group.data.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button disabled variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                {t("group.details.uploadNew")}
              </Button>
              <div className="text-muted-foreground">
                {t("group.details.comingSoon")}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupDetails;
