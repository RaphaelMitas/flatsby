"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Card, CardContent } from "@flatsby/ui/card";

import { useGroupContext } from "~/app/_components/context/group-context";
import { InviteDialog } from "~/app/(app)/group/settings/InviteDialog";
import { useTRPC } from "~/trpc/react";

const dismissedKey = (groupId: number) => `invite_card_dismissed_${groupId}`;

export function InviteFlatmatesCard() {
  const t = useTranslations("invite.solo");
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const [dismissal, setDismissal] = useState<{
    groupId: number;
    dismissed: boolean;
  }>();
  const { data: groups } = useQuery(trpc.group.getUserGroups.queryOptions());
  const groupId = currentGroup?.id;
  const memberCount = groups?.success
    ? groups.data.find(({ id }) => id === groupId)?.memberCount
    : undefined;

  useEffect(() => {
    if (groupId === undefined) return;
    setDismissal({
      groupId,
      dismissed: localStorage.getItem(dismissedKey(groupId)) !== null,
    });
  }, [groupId]);

  if (
    !currentGroup ||
    memberCount !== 1 ||
    dismissal?.groupId !== currentGroup.id ||
    dismissal.dismissed
  )
    return null;

  const dismiss = () => {
    setDismissal({ groupId: currentGroup.id, dismissed: true });
    localStorage.setItem(dismissedKey(currentGroup.id), "true");
  };

  return (
    <Card data-testid="invite-flatmates-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <p className="font-bold">{t("title")}</p>
            <p className="text-muted-foreground text-sm">{t("body")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("dismiss")}
            data-testid="invite-flatmates-dismiss"
            onClick={dismiss}
          >
            <X className="size-4" />
          </Button>
        </div>
        <InviteDialog groupId={currentGroup.id} groupName={currentGroup.name} />
      </CardContent>
    </Card>
  );
}
