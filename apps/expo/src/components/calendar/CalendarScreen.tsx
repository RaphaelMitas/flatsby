import type { GroupWithAccess } from "@flatsby/api";
import type { CalendarPosition } from "@flatsby/validators/calendar";
import { useEffect, useEffectEvent, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePrefetchQuery, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  calendarDateSchema,
  describeListRange,
  formatCalendarDate,
  listAgenda,
  localDate,
  monthAgenda,
  newEntryDate,
  positionWindow,
  showDate,
  shownDates,
  stepPosition,
  switchView,
  weekDays,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { Segmented } from "~/lib/ui/segmented";
import { trpc } from "~/utils/api";
import { useNow } from "~/utils/useNow";
import { CalendarList } from "./CalendarList";
import { TurnBar, useCalendarPeople } from "./CalendarPeople";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => trpc.calendar.range.queryOptions({ groupId, from, to });

export function CalendarScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = localDate(useNow());
  const { date: linked } = useLocalSearchParams<{ date?: string }>();
  const [position, setPosition] = useState<CalendarPosition>({
    view: "list",
    start: null,
    month: null,
  });
  const [member, setMember] = useState<number | null>(null);
  const { mutate: setDone } = useCalendarMutations(group).setDone;

  const { view } = position;
  const { start, month } = shownDates(position, today);
  const rangeOf = (at: CalendarPosition) =>
    calendarRangeOptions(group.id, positionWindow(at, today));
  const { data, refetch } = useQuery(rangeOf(position));
  const range = data?.success ? data.data : undefined;

  usePrefetchQuery(rangeOf(stepPosition(position, -1, today)));
  usePrefetchQuery(rangeOf(stepPosition(position, 1, today)));
  usePrefetchQuery(
    rangeOf(switchView(position, view === "list" ? "month" : "list", today)),
  );

  const show = (date: string) => setPosition(showDate(position, date, today));
  const showList = (date: string) =>
    setPosition(showDate({ ...position, view: "list" }, date, today));

  const onLinked = useEffectEvent((date: string) => {
    if (calendarDateSchema.safeParse(date).success) show(date);
    router.setParams({ date: undefined });
  });
  useEffect(() => {
    if (linked) onLinked(linked);
  }, [linked]);

  const atToday = (view === "list" ? position.start : position.month) === null;
  const list = range
    ? listAgenda(range, start, today, people.meId, member)
    : undefined;
  const grid = range
    ? monthAgenda(range, month, people.meId, member)
    : undefined;
  const shown = view === "list" ? list : grid;

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
          onChange={(next) => setPosition(switchView(position, next, today))}
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
          onPress={() => setPosition(switchView(position, "month", today))}
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
            disabled={atToday}
            onPress={() => show(today)}
          />
          <Button
            testID="calendar-previous"
            variant="ghost"
            size="sm"
            icon="chevron-left"
            accessibilityLabel={
              view === "list" ? t("previousWeek") : t("previousMonth")
            }
            onPress={() => setPosition(stepPosition(position, -1, today))}
          />
          <Button
            testID="calendar-next"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            accessibilityLabel={
              view === "list" ? t("nextWeek") : t("nextMonth")
            }
            onPress={() => setPosition(stepPosition(position, 1, today))}
          />
        </View>
      </View>

      <TurnBar
        group={group}
        people={people}
        turns={shown?.turns ?? new Map()}
        member={member}
        onChange={setMember}
      />

      {data?.success === false ? (
        <Text className="text-destructive p-4 text-center">
          {data.error.message}
        </Text>
      ) : view === "list" ? (
        <CalendarList
          agenda={list}
          dates={weekDays(start)}
          today={today}
          people={people}
          member={member}
          onRefresh={refetch}
          onToggle={(entry, done, skip) =>
            setDone({
              groupId: group.id,
              itemId: entry.item.id,
              date: entry.occurrence.date,
              done,
              // Done once means done now; the days it was left are skipped, not done
              skip: done ? skip : undefined,
            })
          }
          onOpen={(entry) =>
            router.push({
              pathname: "/(tabs)/calendar/[itemId]",
              params: {
                itemId: String(entry.item.id),
                // Only an open occurrence can be skipped
                ...(!entry.occurrence.completedAt && {
                  date: entry.occurrence.date,
                }),
              },
            })
          }
        />
      ) : (
        <MonthGrid
          month={month}
          days={grid?.days}
          today={today}
          onSelect={showList}
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
