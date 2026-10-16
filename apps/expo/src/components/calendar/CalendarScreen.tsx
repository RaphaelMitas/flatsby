import type { GroupWithAccess } from "@flatsby/api";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  calendarDateSchema,
  daySummary,
  entriesOn,
  formatCalendarDate,
  localDate,
  monthGrid,
  monthOf,
  shiftMonth,
  watchLocalDate,
} from "@flatsby/validators/calendar";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import { Segmented } from "~/lib/ui/segmented";
import { prefetch, trpc } from "~/utils/api";
import { CalendarEntryRow } from "./CalendarEntryRow";
import { useCalendarPeople } from "./CalendarPeople";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

export const calendarRangeOptions = (
  groupId: number,
  month: string,
  today: string,
) => {
  const { from, to } = monthGrid(month);
  return trpc.calendar.range.queryOptions({ groupId, from, to, today });
};

export function CalendarScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = useSyncExternalStore(watchLocalDate, localDate);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(monthOf(today));
  const [mine, setMine] = useState(false);
  const [shownToday, setShownToday] = useState(today);
  const { date: jumpTo } = useLocalSearchParams<{ date?: string }>();
  const { setDone } = useCalendarMutations(group);

  const { data, refetch } = useQuery({
    ...calendarRangeOptions(group.id, month, today),
    placeholderData: keepPreviousData,
  });
  const range = data?.success ? data.data : undefined;

  useEffect(() => {
    prefetch(calendarRangeOptions(group.id, shiftMonth(month, -1), today));
    prefetch(calendarRangeOptions(group.id, shiftMonth(month, 1), today));
  }, [group.id, month, today]);

  const select = (date: string) => {
    setSelected(date);
    setMonth(monthOf(date));
  };

  if (shownToday !== today) {
    setShownToday(today);
    if (selected === shownToday) select(today);
  }

  useEffect(() => {
    if (!jumpTo) return;
    if (calendarDateSchema.safeParse(jumpTo).success) {
      setSelected(jumpTo);
      setMonth(monthOf(jumpTo));
    }
    router.setParams({ date: undefined });
  }, [jumpTo, router]);

  const shiftVisibleMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    select(next === monthOf(today) ? today : `${next}-01`);
  };

  const summary = daySummary(
    range ? entriesOn(range, selected) : [],
    people.meId,
  );
  const shown = range
    ? entriesOn(range, selected, mine ? people.meId : undefined)
    : [];
  const openForm = () =>
    router.push({
      pathname: "/(tabs)/calendar/form",
      params: { date: selected },
    });

  return (
    <View className="flex-1">
      <AppScrollView contentContainerClassName="px-4 pb-28" onRefresh={refetch}>
        <Text
          testID="calendar-heading"
          className="text-foreground mb-4 text-3xl font-bold"
        >
          {t("title")}
        </Text>

        <MonthGrid
          month={month}
          days={monthGrid(month).days}
          range={range}
          selected={selected}
          today={today}
          onSelect={select}
          onShiftMonth={shiftVisibleMonth}
        />

        <View className="bg-border -mx-4 my-4 h-px" />

        <View className="mb-3 flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <View className="flex-row items-baseline gap-2">
              <Text className="text-foreground text-xl font-bold">
                {selected === today
                  ? t("today")
                  : formatCalendarDate(selected, locale, {
                      weekday: "long",
                    })}
              </Text>
              <Text className="text-muted-foreground text-base font-medium">
                {formatCalendarDate(selected, locale, {
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            {summary.total > 0 && (
              <Text
                testID="calendar-day-progress"
                className="text-muted-foreground mt-0.5 text-sm"
              >
                {t("dayProgress", summary)}
                {summary.onYou > 0 &&
                  ` · ${t("onYou", { count: summary.onYou })}`}
              </Text>
            )}
          </View>
          <Segmented
            size="sm"
            value={mine ? "mine" : "all"}
            onChange={(value) => setMine(value === "mine")}
            options={[
              { value: "all", label: t("all"), testID: "calendar-filter-all" },
              {
                value: "mine",
                label: t("mine"),
                testID: "calendar-filter-mine",
              },
            ]}
          />
        </View>

        {data?.success === false ? (
          <Text className="text-destructive text-center">
            {data.error.message}
          </Text>
        ) : shown.length > 0 ? (
          <View className="border-border overflow-hidden rounded-lg border">
            {shown.map((entry, index) => (
              <View
                key={`${entry.item.id}-${entry.occurrence.originalDate}`}
                className={index > 0 ? "border-border border-t" : undefined}
              >
                <CalendarEntryRow
                  entry={entry}
                  people={people}
                  today={today}
                  onToggle={(done) =>
                    setDone.mutate({
                      groupId: group.id,
                      itemId: entry.item.id,
                      originalDate: entry.occurrence.originalDate,
                      done,
                      today,
                    })
                  }
                  onOpen={() =>
                    router.push({
                      pathname: "/(tabs)/calendar/[itemId]",
                      params: {
                        itemId: String(entry.item.id),
                        // Only an open occurrence can be skipped or moved
                        ...(!entry.occurrence.completedAt && {
                          date: entry.occurrence.originalDate,
                          at: entry.occurrence.date,
                        }),
                      },
                    })
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <View className="border-border items-center gap-3 rounded-lg border p-6">
            <Text className="text-muted-foreground text-center">
              {mine ? t("nothingOnYou") : t("nothingPlanned")}
            </Text>
            {!mine && (
              <Button
                testID="calendar-empty-add-button"
                variant="outline"
                icon="plus"
                title={t("addSomething")}
                onPress={openForm}
              />
            )}
          </View>
        )}
      </AppScrollView>

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
