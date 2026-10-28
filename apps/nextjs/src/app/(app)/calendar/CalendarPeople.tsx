"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type { Occurrence } from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import { isPlaceholder } from "@flatsby/validators/group";

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
          placeholder={isPlaceholder(member)}
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
      {completedBy && <UserAvatar {...completedBy} size="xs" />}
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
  return (
    <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
      <Chip
        selected={member === null}
        onClick={() => onChange(null)}
        testId="calendar-filter-all"
      >
        {t("all")}
      </Chip>
      {[...members.values()]
        .sort((a, b) => Number(b.id === meId) - Number(a.id === meId))
        .map((person) => (
          <Chip
            key={person.id}
            selected={member === person.id}
            onClick={() => onChange(member === person.id ? null : person.id)}
            testId={`calendar-filter-${person.id}`}
          >
            <UserAvatar
              name={person.user.name}
              image={person.user.image}
              placeholder={isPlaceholder(person)}
              size="sm"
              className="text-foreground"
            />
            {person.id === meId ? t("you") : person.user.name}
            <span className="opacity-60">{turns.get(person.id) ?? 0}</span>
          </Chip>
        ))}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  testId,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      onClick={onClick}
      className="rounded-full"
      data-testid={testId}
    >
      {children}
    </Button>
  );
}
