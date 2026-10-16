import type { GroupWithAccess } from "@flatsby/api";
import type { Occurrence } from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import { Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { cn } from "~/lib/utils";
import { MemberAvatar } from "../expenses/MemberAvatar";

export interface CalendarPeople {
  meId: number;
  person: (groupMemberId: number) => DebtPerson;
}

export function useCalendarPeople(group: GroupWithAccess): CalendarPeople {
  const t = useTranslations();
  const byId = new Map(group.groupMembers.map((member) => [member.id, member]));
  return {
    meId: group.thisGroupMember.id,
    person: (groupMemberId) => {
      const user = byId.get(groupMemberId)?.user;
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
    "turnGroupMemberId" | "completedByGroupMemberId"
  >;
  people: CalendarPeople;
}) {
  const t = useTranslations("calendar");
  const { turnGroupMemberId: turn, completedByGroupMemberId: doneBy } =
    occurrence;

  if (doneBy !== null) {
    const { name } = people.person(doneBy);
    return (
      <PersonPill
        person={people.person(doneBy)}
        label={
          turn !== null && turn !== doneBy
            ? t("coveredBy", { name })
            : t("doneBy", { name })
        }
      />
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
