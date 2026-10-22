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
  const t = useTranslations();
  const member = members.get(memberId);
  const isMe = memberId === meId;
  return (
    <MemberPill member={member} highlighted={isMe}>
      {isMe
        ? t("calendar.yourTurn")
        : t("calendar.turnOf", {
            name: member?.user.name ?? t("common.unknown"),
          })}
    </MemberPill>
  );
}

export function DoneBy({ completedBy }: Pick<Occurrence, "completedBy">) {
  const t = useTranslations();
  return (
    <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
      {t("calendar.doneBy", {
        name: completedBy?.name ?? t("common.unknown"),
      })}
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

export function TurnBar({
  members,
  meId,
  turns,
  member,
  onChange,
}: {
  members: MemberLookup;
  meId: number;
  turns: Map<number, number>;
  member: number | null;
  onChange: (member: number | null) => void;
}) {
  const t = useTranslations("calendar");
  const chip = (selected: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border text-sm font-medium transition-colors",
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "hover:bg-muted",
    );
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
      <button
        type="button"
        aria-pressed={member === null}
        onClick={() => onChange(null)}
        className={cn(chip(member === null), "px-3")}
        data-testid="calendar-filter-all"
      >
        {t("all")}
      </button>
      {[...members.values()].map(({ id, user }) => (
        <button
          key={id}
          type="button"
          aria-pressed={member === id}
          onClick={() => onChange(member === id ? null : id)}
          className={cn(chip(member === id), "pr-3 pl-1")}
          data-testid={`calendar-filter-${id}`}
        >
          <UserAvatar
            name={user.name}
            image={user.image}
            size="sm"
            className="text-foreground"
          />
          {id === meId ? t("you") : user.name}
          <span
            className={member === id ? "opacity-70" : "text-muted-foreground"}
          >
            {turns.get(id) ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
