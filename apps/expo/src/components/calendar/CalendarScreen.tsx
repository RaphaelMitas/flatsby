import type { GroupWithAccess } from "@flatsby/api";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  addDays,
  calendarDateSchema,
  describeListRange,
  formatCalendarDate,
  listAgenda,
  listWindow,
  localDate,
  monthAgenda,
  monthGrid,
  monthOf,
  shiftMonth,
  weekDays,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { Segmented } from "~/lib/ui/segmented";
import { prefetch, trpc } from "~/utils/api";
import { CalendarList } from "./CalendarList";
import { TurnBar, useCalendarPeople } from "./CalendarPeople";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

export const calendarRangeOptions = (
  groupId: number,
  { from, to }: { from: string; to: string },
) => trpc.calendar.range.queryOptions({ groupId, from, to });

type CalendarView = "list" | "month";

export function CalendarScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = localDate();
  const { date: linked } = useLocalSearchParams<{ date?: string }>();
  const [view, setView] = useState<CalendarView>("list");
  // null follows today, so a screen left open overnight moves on with it
  const [start, setStart] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [member, setMember] = useState<number | null>(null);
  const { mutate: setDone } = useCalendarMutations(group).setDone;

  const listStart = start ?? today;
  const shownMonth = month ?? monthOf(today);
  const windowOf = (view: CalendarView, step = 0) =>
    view === "list"
      ? listWindow(addDays(listStart, 7 * step), today)
      : monthGrid(shiftMonth(shownMonth, step));

  const { data, refetch } = useQuery(
    calendarRangeOptions(group.id, windowOf(view)),
  );
  const range = data?.success ? data.data : undefined;

  // The neighbouring steps and the other view, so neither stepping nor switching waits on the network
  const nearby = [
    windowOf(view, -1),
    windowOf(view, 1),
    windowOf(view === "list" ? "month" : "list"),
  ]
    .map(({ from, to }) => `${from}/${to}`)
    .join(" ");
  useEffect(() => {
    for (const [from = "", to = ""] of nearby
      .split(" ")
      .map((span) => span.split("/"))) {
      prefetch(calendarRangeOptions(group.id, { from, to }));
    }
  }, [group.id, nearby]);

  const showList = (date: string) => {
    setView("list");
    setStart(date === today ? null : date);
  };

  useEffect(() => {
    if (!linked) return;
    if (calendarDateSchema.safeParse(linked).success) {
      setView("list");
      setStart(linked === today ? null : linked);
    }
    router.setParams({ date: undefined });
  }, [linked, router, today]);

  const atToday =
    view === "list" ? listStart === today : shownMonth === monthOf(today);
  const step = (delta: number) =>
    view === "list"
      ? showList(addDays(listStart, 7 * delta))
      : setMonth(shiftMonth(shownMonth, delta));

  const listDates = weekDays(listStart);
  const list = range
    ? listAgenda(range, listStart, today, people.meId, member)
    : undefined;
  const grid = range
    ? monthAgenda(range, shownMonth, people.meId, member)
    : undefined;
  const shown = view === "list" ? list : grid;

  const openForm = () =>
    router.push({
      pathname: "/(tabs)/calendar/form",
      params: {
        date:
          view === "list" ? listStart : atToday ? today : `${shownMonth}-01`,
      },
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
          onChange={setView}
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
          onPress={() => {
            setMonth(monthOf(listStart));
            setView("month");
          }}
        >
          <Text className="text-foreground text-lg font-semibold">
            {view === "list"
              ? describeListRange(listStart, locale)
              : formatCalendarDate(`${shownMonth}-01`, locale, {
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
            onPress={() => (view === "list" ? showList(today) : setMonth(null))}
          />
          <Button
            testID="calendar-previous"
            variant="ghost"
            size="sm"
            icon="chevron-left"
            accessibilityLabel={
              view === "list" ? t("previousWeek") : t("previousMonth")
            }
            onPress={() => step(-1)}
          />
          <Button
            testID="calendar-next"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            accessibilityLabel={
              view === "list" ? t("nextWeek") : t("nextMonth")
            }
            onPress={() => step(1)}
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
          dates={listDates}
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
          month={shownMonth}
          days={grid?.days}
          dates={monthGrid(shownMonth).weeks.flat()}
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
