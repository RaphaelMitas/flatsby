"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

import { Button } from "@flatsby/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@flatsby/ui/dialog";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  formatInviteCode,
  inviteDaysLeft,
  inviteLink,
} from "@flatsby/validators/invite";

import { CopyButton } from "~/app/_components/CopyButton";
import { useTRPC } from "~/trpc/react";

export const InviteDialog = ({
  groupId,
  groupName,
}: {
  groupId: number;
  groupName: string;
}) => {
  const t = useTranslations();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button data-testid="group-invite-button" className="w-full md:w-fit">
          <Plus className="mr-2 h-4 w-4" />
          {t("invite.open")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("invite.title", { group: groupName })}</DialogTitle>
          <DialogDescription>{t("invite.anyoneCanJoin")}</DialogDescription>
        </DialogHeader>
        <InviteContent groupId={groupId} />
      </DialogContent>
    </Dialog>
  );
};

const InviteContent = ({ groupId }: { groupId: number }) => {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const inviteQuery = useQuery(trpc.invite.get.queryOptions({ groupId }));

  const resetMutation = useMutation(
    trpc.invite.reset.mutationOptions({
      onMutate: () =>
        queryClient.cancelQueries(trpc.invite.get.queryFilter({ groupId })),
      onSuccess: (data) => {
        if (!data.success) return;
        queryClient.setQueryData(trpc.invite.get.queryKey({ groupId }), data);
      },
    }),
  );

  if (inviteQuery.isError || inviteQuery.data?.success === false) {
    return (
      <p className="text-destructive text-sm">
        {inviteQuery.data?.success === false
          ? inviteQuery.data.error.message
          : t("invite.loadFailed")}
      </p>
    );
  }

  const invite = inviteQuery.data?.data;
  if (!invite) {
    return <Skeleton className="mx-auto h-64 w-48" />;
  }

  const link = inviteLink(window.location.origin, invite.code);
  const resetFailed =
    resetMutation.isError || resetMutation.data?.success === false;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-muted-foreground text-center text-sm">
        {t("invite.scanWithCamera")}
      </p>
      <div className="mx-auto rounded-lg bg-white p-3">
        <QRCode value={link} size={160} />
      </div>
      <p className="text-muted-foreground text-center text-xs">
        {t("invite.orEnterCode")}
      </p>
      <div
        data-testid="group-invite-code"
        className="text-center font-mono text-2xl font-bold tracking-widest"
      >
        {formatInviteCode(invite.code)}
      </div>
      <div className="flex items-center gap-2 rounded-lg border p-2 pl-3">
        <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
          {link}
        </span>
        <CopyButton value={link} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {t("invite.expiresIn", { days: inviteDaysLeft(invite.expiresAt) })}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={resetMutation.isPending}
          onClick={() => resetMutation.mutate({ groupId })}
        >
          {t("invite.resetLink")}
        </Button>
      </div>
      {resetFailed && (
        <p className="text-destructive text-sm">{t("invite.resetFailed")}</p>
      )}
    </div>
  );
};
