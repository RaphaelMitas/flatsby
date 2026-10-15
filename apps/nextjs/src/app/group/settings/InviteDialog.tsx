"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
  inviteExpiryLabel,
  inviteLink,
} from "@flatsby/validators/invite";

import { useTRPC } from "~/trpc/react";
import { CopyButton } from "../../_components/CopyButton";

export const InviteDialog = ({
  groupId,
  groupName,
}: {
  groupId: number;
  groupName: string;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="group-invite-button" className="w-full md:w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Invite people
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite to {groupName}</DialogTitle>
          <DialogDescription>
            Anyone with this link or code can join.
          </DialogDescription>
        </DialogHeader>
        {open && <InviteContent groupId={groupId} />}
      </DialogContent>
    </Dialog>
  );
};

const InviteContent = ({ groupId }: { groupId: number }) => {
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

  if (inviteQuery.data?.success === false) {
    return (
      <p className="text-destructive text-sm">
        {inviteQuery.data.error.message}
      </p>
    );
  }

  const invite = inviteQuery.data?.data;
  if (!invite) {
    return <Skeleton className="mx-auto h-64 w-48" />;
  }

  const link = inviteLink(window.location.origin, invite.code);

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto rounded-lg bg-white p-3">
        <QRCode value={link} size={160} />
      </div>
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
          {inviteExpiryLabel(invite.expiresAt)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={resetMutation.isPending}
          onClick={() => resetMutation.mutate({ groupId })}
        >
          Reset link
        </Button>
      </div>
    </div>
  );
};
