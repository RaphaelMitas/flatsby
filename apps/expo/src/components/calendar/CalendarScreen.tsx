import type { GroupWithAccess } from "@flatsby/api";
import type { CalendarPosition } from "@flatsby/validators/calendar";
import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePrefetchQuery, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  agendaAt,
  calendarDateSchema,
  describeListRange,
  formatCalendarDate,
  localDate,
  newEntryDate,
  otherView,
  positionWindow,
  revealDate,
  showDate,
  shownDates,
  showsToday,
  stepPosition,
  switchView,
  tickInput,
  todayPosition,
  weekDays,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { Segmented } from "~/lib/ui/segmented";
import { queryClient, trpc } from "~/utils/api";
import { useNow } from "~/utils/useNow";
import { CalendarList } from "./CalendarList";
import { TurnBar, useCalendarPeople } from "./CalendarPeople";
import { setCalendarPosition, useCalendarPosition } from "./calendarPosition";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => ({
  ...trpc.calendar.range.queryOptions({ groupId, from, to }),
  // Refetching a range mid-write would wipe its optimistic patch
  staleTime: () =>
    queryClient.isMutating({ mutationKey: trpc.calendar.pathKey() }) > 0
      ? Number.POSITIVE_INFINITY
      : 0,
});

export function CalendarScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = localDate(useNow());
  const { date: linked } = useLocalSearchParams<{ date?: string }>();
  const position = useCalendarPosition();
  const [member, setMember] = useState<number | null>(null);
  const rangeAt = (at: CalendarPosition) =>
    calendarRangeOptions(group.id, positionWindow(at, today));
  const { data, refetch } = useQuery(rangeAt(position));
  usePrefetchQuery(rangeAt(stepPosition(position, -1, today)));
  usePrefetchQuery(rangeAt(stepPosition(position, 1, today)));
  usePrefetchQuery(rangeAt(switchView(position, otherView(position), today)));
  const { start, month } = shownDates(position, today);
  const agenda = data?.success
    ? agendaAt(data.data, position, today, people.meId, member)
    : undefined;
  const { mutate: setDone } = useCalendarMutations(group).setDone;
  const { view } = position;

  const onLinked = useEffectEvent((date: string) => {
    if (calendarDateSchema.safeParse(date).success)
      setCalendarPosition(revealDate(position, date, today));
    router.setParams({ date: undefined });
  });
  useEffect(() => {
    if (linked) onLinked(linked);
  }, [linked]);

  const openForm = () =>
    router.push({
      pathname: "/(tabs)/calendar/form",
      params: { date: newEntryDate(position, today) },
    });

  return (
    <View className="flex-1">
      <View className="mb-2 flex-row items-center justify-between gap-2 px-4">
        <Text
          testID="calendar-heading"
          className="text-foreground text-3xl font-bold"
        >
          {t("title")}
        </Text>
        <Segmented
          size="sm"
          value={view}
          onChange={(next) =>
            setCalendarPosition(switchView(position, next, today))
          }
          options={[
            { value: "list", label: t("list"), testID: "calendar-view-list" },
            {
              value: "month",
              label: t("month"),
              testID: "calendar-view-month",
            },
          ]}
        />
      </View>

      <View className="mb-2 h-10 flex-row items-center justify-between gap-2 px-4">
        <Pressable
          testID="calendar-range-title"
          accessibilityRole="button"
          disabled={view === "month"}
          onPress={() =>
            setCalendarPosition(switchView(position, "month", today))
          }
        >
          <Text className="text-foreground text-lg font-semibold">
            {view === "list"
              ? describeListRange(start, locale)
              : formatCalendarDate(`${month}-01`, locale, {
                  month: "long",
                  year: "numeric",
                })}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1">
          <Button
            testID="calendar-today-button"
            variant="outline"
            size="sm"
            title={t("today")}
            disabled={showsToday(position)}
            onPress={() => setCalendarPosition(todayPosition(position))}
          />
          <Button
            testID="calendar-previous"
            variant="ghost"
            size="sm"
            icon="chevron-left"
            accessibilityLabel={
              view === "list" ? t("previousWeek") : t("previousMonth")
            }
            onPress={() =>
              setCalendarPosition(stepPosition(position, -1, today))
            }
          />
          <Button
            testID="calendar-next"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            accessibilityLabel={
              view === "list" ? t("nextWeek") : t("nextMonth")
            }
            onPress={() =>
              setCalendarPosition(stepPosition(position, 1, today))
            }
          />
        </View>
      </View>

      <TurnBar
        group={group}
        people={people}
        turns={agenda?.turns ?? new Map()}
        member={member}
        onChange={setMember}
      />

      {data?.success === false ? (
        <Text className="text-destructive p-4 text-center">
          {data.error.message}
        </Text>
      ) : view === "list" ? (
        <CalendarList
          agenda={agenda}
          dates={weekDays(start)}
          today={today}
          people={people}
          member={member}
          onRefresh={refetch}
          onToggle={(entry, done) => setDone(tickInput(group.id, entry, done))}
          onOpen={(entry) =>
            router.push({
              pathname: "/(tabs)/calendar/[itemId]",
              params: {
                itemId: String(entry.item.id),
                // Only an open occurrence can be skipped, along with the days it was left
                ...(!entry.occurrence.completedAt && {
                  date: entry.occurrence.date,
                  ...(entry.missed?.length
                    ? { missed: entry.missed.join(",") }
                    : {}),
                }),
              },
            })
          }
        />
      ) : (
        <MonthGrid
          month={month}
          days={agenda?.days}
          today={today}
          onSelect={(date) =>
            setCalendarPosition(
              showDate({ ...position, view: "list" }, date, today),
            )
          }
        />
      )}

      <View className="absolute right-4 bottom-4">
        <Button
          testID="calendar-add-button"
          size="icon"
          icon="plus"
          accessibilityLabel={t("add")}
          onPress={openForm}
        />
      </View>
    </View>
  );
}
