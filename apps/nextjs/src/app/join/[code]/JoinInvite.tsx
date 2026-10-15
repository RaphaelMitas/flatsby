"use client";

import type { RouterOutputs } from "@flatsby/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";

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
  INVITE_PATH,
  INVITE_REFERRER_KEY,
} from "@flatsby/validators/invite";

import type { Platform } from "../../_components/landing/platform";
import { useTRPC } from "~/trpc/react";
import { CopyButton } from "../../_components/CopyButton";
import {
  APP_STORE_URL,
  PLAY_STORE_ID,
  PLAY_STORE_URL,
} from "../../_components/landing/content";

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
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const openGroup = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions({
      onSuccess: () => {
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
          <EmptyTitle>This invite has expired</EmptyTitle>
          <EmptyDescription>
            Ask someone in the group for a new link.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href="/">Go to Flatsby</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (preview.isMember) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>You're already in {preview.groupName}</EmptyTitle>
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
            Open group
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const signInHref = `/auth/login?next=${INVITE_PATH}/${code}`;
  const joinError =
    join.data?.success === false ? join.data.error.message : null;

  return (
    <Card className="flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center">
      <UserAvatar
        name={preview.groupName}
        image={preview.profilePicture}
        size="2xl"
      />
      <p className="text-muted-foreground text-sm">
        {preview.invitedBy} invited you to
      </p>
      <h1 className="text-2xl font-bold" data-testid="join-invite-group-name">
        {preview.groupName}
      </h1>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {preview.members.map((member) => (
            <UserAvatar
              key={member.name}
              name={member.name}
              image={member.image}
              size="md"
              className="ring-card ring-2"
            />
          ))}
        </div>
        <span className="text-muted-foreground text-sm">
          {preview.memberCount}{" "}
          {preview.memberCount === 1 ? "member" : "members"}
        </span>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Members will see your name and profile picture, and you'll see the
        group's lists and expenses.
      </p>

      <div className="mt-4 flex w-full flex-col gap-2">
        {signedIn ? (
          <>
            {joinError && (
              <p className="text-destructive text-sm">{joinError}</p>
            )}
            <Button
              data-testid="join-invite-button"
              disabled={join.isPending || openGroup.isPending}
              onClick={() => join.mutate({ code })}
            >
              Join {preview.groupName}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/">Not now</Link>
            </Button>
          </>
        ) : platform === "other" ? (
          <Button asChild>
            <Link href={signInHref}>Sign in to join</Link>
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
  const playStoreUrl = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`${INVITE_REFERRER_KEY}=${code}`)}`;

  return (
    <>
      {platform === "ios" ? (
        <Button asChild>
          <a href={APP_STORE_URL}>
            <AppleIcon className="h-5 w-5 text-current" />
            Download on the App Store
          </a>
        </Button>
      ) : (
        <>
          <Button asChild>
            <a
              href={`intent:/${INVITE_PATH}/${code}#Intent;scheme=flatsby;package=${PLAY_STORE_ID};S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`}
            >
              Open in Flatsby
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={playStoreUrl}>
              <Play className="h-5 w-5" />
              Get it on Google Play
            </a>
          </Button>
        </>
      )}
      <div className="rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">
          After installing, tap "Join with code"
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest">
            {formatInviteCode(code)}
          </span>
          <CopyButton value={code} />
        </div>
      </div>
      <Button variant="ghost" asChild>
        <Link href={signInHref}>Continue in browser</Link>
      </Button>
    </>
  );
}
