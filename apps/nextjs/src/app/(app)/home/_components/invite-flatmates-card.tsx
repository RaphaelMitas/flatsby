"use client";

import type { InvitePlaceholder } from "@flatsby/validators/group";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Share, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { Button } from "@flatsby/ui/button";
import { Card, CardContent } from "@flatsby/ui/card";
import { toast } from "@flatsby/ui/toast";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { openPlaceholders } from "@flatsby/validators/group";
import {
  formatInviteCode,
  inviteDaysLeft,
  inviteMessage,
  spokenInviteCode,
} from "@flatsby/validators/invite";
import {
  markInviteShared,
  useWaitingForFlatmates,
} from "@flatsby/validators/useWaitingForFlatmates";

import { useGroupContext } from "~/app/_components/context/group-context";
import { platformForUserAgent } from "~/app/_components/landing/platform";
import { useTRPC } from "~/trpc/react";

const dismissedKey = (groupId: number) => `invite_card_dismissed_${groupId}`;

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

export function InviteFlatmatesCard() {
  const t = useTranslations();
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const [dismissal, setDismissal] = useState<{
    groupId: number;
    dismissed: boolean;
  }>();
  const sharing = useRef(false);
  const groupId = currentGroup?.id ?? 0;
  const hasGroup = currentGroup != null;
  const { data: group } = useQuery({
    ...trpc.group.getGroup.queryOptions({ id: groupId }),
    enabled: hasGroup,
  });
  const waiting = useWaitingForFlatmates(
    groupId,
    group?.success ? group.data.groupMembers : undefined,
  );
  const visible =
    waiting && dismissal?.groupId === groupId && !dismissal.dismissed;

  const invite = useQuery({
    ...trpc.invite.get.queryOptions({ groupId }),
    enabled: visible,
  });
  const sharePressed = useMutation(trpc.invite.sharePressed.mutationOptions());

  useEffect(() => {
    if (!hasGroup) return;
    setDismissal({
      groupId,
      dismissed: localStorage.getItem(dismissedKey(groupId)) !== null,
    });
  }, [hasGroup, groupId]);

  if (!visible || !group?.success) return null;

  const dismiss = () => {
    setDismissal({ groupId, dismissed: true });
    localStorage.setItem(dismissedKey(groupId), "true");
  };

  const placeholders = openPlaceholders(group.data.groupMembers);
  const code = invite.data?.success ? invite.data.data : undefined;
  const loadFailure = failureOf(invite, t("invite.loadFailed"));
  const messageFor = (inviteCode: string, placeholder?: InvitePlaceholder) =>
    inviteMessage(t, window.location.origin, inviteCode, placeholder);

  const copy = async (text: string, name?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        name === undefined
          ? t("common.copied")
          : t("invite.card.copiedFor", { name }),
      );
    } catch {
      toast.error(t("invite.card.copyFailed"));
    }
  };

  const share = async (placeholder?: InvitePlaceholder) => {
    if (!code || sharing.current) return;
    markInviteShared(groupId);
    sharePressed.mutate({ groupId, personal: placeholder !== undefined });
    const text = messageFor(code.code, placeholder);
    // Desktop browsers have navigator.share too, but there the message belongs in the clipboard
    if (platformForUserAgent(navigator.userAgent) === "other") {
      return copy(text, placeholder?.name);
    }
    sharing.current = true;
    try {
      await navigator.share({ text });
    } catch (error) {
      if (!isAbort(error)) await copy(text, placeholder?.name);
    } finally {
      sharing.current = false;
    }
  };

  return (
    <Card data-testid="invite-flatmates-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <p className="flex-1 font-bold">
            {t("invite.card.title", { group: group.data.name })}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("invite.card.dismiss")}
            data-testid="invite-flatmates-dismiss"
            onClick={dismiss}
          >
            <X className="size-4" />
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {placeholders.length > 0
            ? t("invite.card.namedBody")
            : t("invite.card.body")}
        </p>

        {loadFailure ? (
          <div className="flex flex-col gap-2">
            <p className="text-destructive text-sm">{loadFailure}</p>
            <Button
              variant="outline"
              disabled={invite.isFetching}
              onClick={() => void invite.refetch()}
            >
              {t("home.retry")}
            </Button>
          </div>
        ) : (
          <>
            {code && (
              <figure
                data-testid="invite-card-preview"
                className="bg-muted flex flex-col gap-1 rounded-lg p-3"
              >
                <figcaption className="text-muted-foreground text-xs">
                  {t("invite.card.preview")}
                </figcaption>
                <blockquote className="line-clamp-4 text-sm break-words italic">
                  {messageFor(code.code, placeholders[0])}
                </blockquote>
              </figure>
            )}

            {placeholders.length === 0 ? (
              <Button
                data-testid="invite-card-share"
                aria-busy={!code}
                onClick={() => void share()}
              >
                <Share className="size-4" />
                {t("invite.shareLink")}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-2">
                  {placeholders.map((placeholder) => (
                    <li
                      key={placeholder.id}
                      className="flex items-center gap-3"
                    >
                      <UserAvatar
                        name={placeholder.name}
                        placeholder
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {placeholder.name}
                      </span>
                      <Button
                        size="sm"
                        data-testid={`invite-card-send-${placeholder.id}`}
                        aria-label={t("invite.card.sendTo", {
                          name: placeholder.name,
                        })}
                        aria-busy={!code}
                        onClick={() => void share(placeholder)}
                      >
                        <Share className="size-4" />
                        {t("invite.card.send")}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  data-testid="invite-card-group-chat"
                  aria-busy={!code}
                  onClick={() => void share()}
                >
                  {t("invite.card.groupChat")}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground text-xs">
                {t("invite.card.code")}
              </span>
              {code && (
                <span>
                  <span
                    aria-hidden
                    data-testid="invite-card-code"
                    className="font-mono font-bold tracking-widest"
                  >
                    {formatInviteCode(code.code)}
                  </span>
                  <span className="sr-only">{spokenInviteCode(code.code)}</span>
                </span>
              )}
            </div>
            {code && (
              <p className="text-muted-foreground text-xs">
                {t("invite.expiresIn", {
                  days: inviteDaysLeft(code.expiresAt),
                })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
