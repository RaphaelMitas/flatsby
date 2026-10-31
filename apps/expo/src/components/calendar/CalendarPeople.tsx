import type { GroupWithAccess } from "@flatsby/api";
import type { Occurrence } from "@flatsby/validators/calendar";
import type { DebtPerson } from "@flatsby/validators/expenses/formatting";
import { ScrollView, Text, View } from "react-native";
import { useTranslations } from "use-intl";

import { memberPerson } from "@flatsby/validators/expenses/formatting";

import { Chip } from "~/lib/ui/chip";
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
      const member =
        groupMemberId === null ? undefined : byId.get(groupMemberId);
      return member
        ? memberPerson(member)
        : { name: t("common.unknown"), image: null };
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

export function TurnBar({
  group,
  people,
  turns,
  member,
  onChange,
}: {
  group: GroupWithAccess;
  people: CalendarPeople;
  turns: Map<number, number>;
  member: number | null;
  onChange: (member: number | null) => void;
}) {
  const t = useTranslations("calendar");
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-3 grow-0"
      contentContainerClassName="gap-1.5 px-4"
    >
      <Chip
        testID="calendar-filter-all"
        label={t("all")}
        active={member === null}
        onPress={() => onChange(null)}
      />
      {[...group.groupMembers]
        .sort(
          (a, b) => Number(b.id === people.meId) - Number(a.id === people.meId),
        )
        .map(({ id }) => {
          const person = people.person(id);
          return (
            <Chip
              key={id}
              testID={`calendar-filter-${id}`}
              label={`${id === people.meId ? t("you") : person.name} ${turns.get(id) ?? 0}`}
              active={member === id}
              onPress={() => onChange(member === id ? null : id)}
            >
              <MemberAvatar
                person={person}
                className="-ml-2 h-6 w-6"
                textClassName="text-xs"
              />
            </Chip>
          );
        })}
    </ScrollView>
  );
}
