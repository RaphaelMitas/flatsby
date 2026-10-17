import type { GroupWithAccess } from "@flatsby/api";
import type { Occurrence } from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { cn } from "~/lib/utils";
import { MemberAvatar } from "../expenses/MemberAvatar";

export interface CalendarPeople {
  meId: number;
  /** null is a member whose account is gone */
  person: (groupMemberId: number | null) => DebtPerson;
}

export function useCalendarPeople(group: GroupWithAccess): CalendarPeople {
  const t = useTranslations();
  const byId = new Map(group.groupMembers.map((member) => [member.id, member]));
  return {
    meId: group.thisGroupMember.id,
    person: (groupMemberId) => {
      const user =
        groupMemberId === null ? undefined : byId.get(groupMemberId)?.user;
      return {
        name: user?.name ?? t("common.unknown"),
        image: user?.image ?? null,
      };
    },
  };
}

export function PersonPill({
  person,
  label,
  highlighted = false,
}: {
  person: DebtPerson;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5",
        highlighted ? "bg-primary" : "bg-muted",
      )}
    >
      <MemberAvatar
        person={person}
        className="h-5 w-5"
        textClassName="text-xs"
      />
      <Text
        numberOfLines={1}
        className={cn(
          "text-xs font-semibold",
          highlighted ? "text-primary-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </Text>
    </View>
  );
}

export function OccurrenceStatus({
  occurrence,
  people,
}: {
  occurrence: Pick<
    Occurrence,
    "turnGroupMemberId" | "completedBy" | "completedAt"
  >;
  people: CalendarPeople;
}) {
  const t = useTranslations("calendar");
  const turn = occurrence.turnGroupMemberId;

  if (occurrence.completedAt) {
    const doer = occurrence.completedBy ?? people.person(null);
    return (
      <PersonPill person={doer} label={t("doneBy", { name: doer.name })} />
    );
  }
  if (turn === null) return null;
  const mine = turn === people.meId;
  return (
    <PersonPill
      person={people.person(turn)}
      label={
        mine ? t("yourTurn") : t("turnOf", { name: people.person(turn).name })
      }
      highlighted={mine}
    />
  );
}
