"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { UserAvatar } from "@flatsby/ui/user-avatar";

export type MemberLookup = Map<number, GroupMemberWithUserInfo>;

export function MemberPill({
  member,
  highlighted,
  children,
}: {
  member: GroupMemberWithUserInfo | undefined;
  highlighted?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-xs font-semibold",
        highlighted
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {member && (
        <UserAvatar
          name={member.user.name}
          image={member.user.image}
          size="xs"
          className="text-foreground"
        />
      )}
      {children}
    </span>
  );
}

export function TurnPill({
  memberId,
  meId,
  members,
}: {
  memberId: number;
  meId: number;
  members: MemberLookup;
}) {
  const t = useTranslations("calendar");
  const member = members.get(memberId);
  const isMe = memberId === meId;
  return (
    <MemberPill member={member} highlighted={isMe}>
      {isMe ? t("yourTurn") : t("turnOf", { name: member?.user.name ?? "" })}
    </MemberPill>
  );
}

export function DoneBy({
  byId,
  turnId,
  members,
}: {
  byId: number | null;
  turnId: number | null;
  members: MemberLookup;
}) {
  const t = useTranslations();
  const member = byId === null ? undefined : members.get(byId);
  const name = member?.user.name ?? t("common.unknown");
  return (
    <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
      {turnId !== null && byId !== turnId
        ? t("calendar.coveredBy", { name })
        : t("calendar.doneBy", { name })}
      {member && (
        <UserAvatar
          name={member.user.name}
          image={member.user.image}
          size="xs"
        />
      )}
    </span>
  );
}
