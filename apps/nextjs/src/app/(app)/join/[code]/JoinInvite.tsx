"use client";

import type { RouterOutputs } from "@flatsby/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";

import { failureOf } from "@flatsby/api/resultMutation";
import { Button } from "@flatsby/ui/button";
import { Card } from "@flatsby/ui/card";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@flatsby/ui/empty";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  formatInviteCode,
  INVITE_REFERRER_KEY,
  invitePath,
} from "@flatsby/validators/invite";
import { PLAY_STORE_ID } from "@flatsby/validators/store";

import type { Platform } from "~/app/_components/landing/platform";
import { CopyButton } from "~/app/_components/CopyButton";
import {
  APP_STORE_LINK,
  PLAY_STORE_LINK,
  SITE_URL,
} from "~/app/_components/landing/content";
import { useTRPC } from "~/trpc/react";

type InvitePreview = Extract<
  RouterOutputs["invite"]["preview"],
  { success: true }
>["data"];

export function JoinInvite({
  code,
  preview,
  signedIn,
  platform,
}: {
  code: string;
  preview: InvitePreview | null;
  signedIn: boolean;
  platform: Platform;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const openGroup = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries(
          trpc.group.getUserGroups.queryFilter(),
        );
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryFilter(),
        );
        router.push("/home");
      },
    }),
  );

  const join = useMutation(
    trpc.invite.join.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          openGroup.mutate({
            groupId: data.data.groupId,
            shoppingListId: null,
          });
        }
      },
    }),
  );

  if (!preview) {
    return (
      <Empty data-testid="join-invite-expired">
        <EmptyHeader>
          <EmptyTitle>{t("invite.join.expiredTitle")}</EmptyTitle>
          <EmptyDescription>{t("invite.join.expiredHint")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/">{t("invite.join.goToFlatsby")}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (preview.isMember) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {t("invite.join.alreadyMember", { group: preview.groupName })}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button
            disabled={openGroup.isPending}
            onClick={() =>
              openGroup.mutate({
                groupId: preview.groupId,
                shoppingListId: null,
              })
            }
          >
            {t("invite.join.openGroup")}
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const signInHref = `/auth/login?next=${invitePath(code)}`;
  const joinError = failureOf(join, t("invite.join.joinFailed"));

  return (
    <Card className="flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
      <UserAvatar
        name={preview.groupName}
        image={preview.profilePicture}
        size="2xl"
      />
      <p className="text-muted-foreground text-sm">
        {t("invite.join.invitedYouTo", { name: preview.invitedBy })}
      </p>
      <h1 className="text-2xl font-bold" data-testid="join-invite-group-name">
        {preview.groupName}
      </h1>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {preview.members.map((member, i) => (
            <UserAvatar
              // biome-ignore lint/suspicious/noArrayIndexKey: names repeat and the public preview carries no ids
              key={i}
              name={member.name}
              image={member.image}
              size="md"
              className="ring-card ring-2"
            />
          ))}
        </div>
        <span className="text-muted-foreground text-sm">
          {t("group.memberCount", { count: preview.memberCount })}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {t("invite.join.consent")}
      </p>

      <div className="mt-4 flex w-full flex-col gap-2">
        {signedIn ? (
          <>
            {joinError && (
              <p className="text-destructive text-sm">{joinError}</p>
            )}
            <Button
              data-testid="join-invite-button"
              className="h-auto whitespace-normal"
              disabled={join.isPending || openGroup.isPending}
              onClick={() => join.mutate({ code })}
            >
              {t("invite.join.join", { group: preview.groupName })}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">{t("invite.join.notNow")}</Link>
            </Button>
          </>
        ) : platform === "other" ? (
          <Button asChild className="h-auto whitespace-normal">
            <Link href={signInHref}>
              {t("invite.join.signInToJoinGroup", { group: preview.groupName })}
            </Link>
          </Button>
        ) : (
          <InstallApp platform={platform} code={code} signInHref={signInHref} />
        )}
      </div>
    </Card>
  );
}

function InstallApp({
  platform,
  code,
  signInHref,
}: {
  platform: Exclude<Platform, "other">;
  code: string;
  signInHref: string;
}) {
  const t = useTranslations();
  const invite = `?${new URLSearchParams({ [INVITE_REFERRER_KEY]: code })}`;
  // Chrome only follows an absolute fallback URL out of an intent link
  const playStoreFallback = `${SITE_URL}${PLAY_STORE_LINK}${invite}`;

  return (
    <>
      {platform === "ios" ? (
        <Button asChild>
          <a href={`${APP_STORE_LINK}${invite}`}>
            <AppleIcon className="h-5 w-5 text-current" />
            {t("invite.join.appStore")}
          </a>
        </Button>
      ) : (
        <>
          <Button asChild>
            <a
              href={`intent:/${invitePath(code)}#Intent;scheme=flatsby;package=${PLAY_STORE_ID};S.browser_fallback_url=${encodeURIComponent(playStoreFallback)};end`}
            >
              {t("invite.join.openInApp")}
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`${PLAY_STORE_LINK}${invite}`}>
              <Play className="h-5 w-5" />
              {t("invite.join.googlePlay")}
            </a>
          </Button>
        </>
      )}
      <div className="rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">
          {t("invite.join.afterInstall")}
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest whitespace-nowrap">
            {formatInviteCode(code)}
          </span>
          <CopyButton value={code} />
        </div>
      </div>
      <Button variant="ghost" asChild>
        <Link href={signInHref}>{t("invite.join.continueInBrowser")}</Link>
      </Button>
    </>
  );
}
