"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type { Occurrence } from "@flatsby/validators/calendar";
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
  occurrence,
  members,
}: {
  occurrence: Pick<
    Occurrence,
    "completedByGroupMemberId" | "completedBy" | "turnGroupMemberId"
  >;
  members: MemberLookup;
}) {
  const t = useTranslations();
  const {
    completedByGroupMemberId: byId,
    completedBy,
    turnGroupMemberId,
  } = occurrence;
  const name = completedBy?.name ?? t("common.unknown");
  // Turns of someone who left are dealt to the others, so only a current member can have covered
  const covered =
    byId !== null &&
    members.has(byId) &&
    turnGroupMemberId !== null &&
    byId !== turnGroupMemberId;
  return (
    <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
      {covered
        ? t("calendar.coveredBy", { name })
        : t("calendar.doneBy", { name })}
      {completedBy && (
        <UserAvatar
          name={completedBy.name}
          image={completedBy.image}
          size="xs"
        />
      )}
    </span>
  );
}
