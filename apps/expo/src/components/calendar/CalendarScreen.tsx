import type { GroupWithAccess } from "@flatsby/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  calendarDateSchema,
  daySummary,
  entriesOn,
  localDate,
  monthGrid,
  monthOf,
  monthsOf,
  shiftMonth,
  spanAround,
  stepFrom,
} from "@flatsby/validators/calendar";

import type { CalendarAgendaHandle } from "./CalendarAgenda";
import { Button } from "~/lib/ui/button";
import { Segmented } from "~/lib/ui/segmented";
import { trpc } from "~/utils/api";
import { CalendarAgenda, DayHeading } from "./CalendarAgenda";
import { useCalendarPeople } from "./CalendarPeople";
import { MONTH_COVER, MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

export const calendarRangeOptions = (groupId: number, month: string) => {
  const { from, to } = monthGrid(month);
  return trpc.calendar.range.queryOptions({ groupId, from, to });
};

export function CalendarScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const people = useCalendarPeople(group);
  const today = localDate();
  const { date: jumpTo } = useLocalSearchParams<{ date?: string }>();
  // A link that opens the screen starts on its day; jumping there right after mount races FlashList's first scroll and leaves it blank
  const linkedOnMount = useRef(jumpTo);
  const [start] = useState(
    () => calendarDateSchema.safeParse(jumpTo).data ?? today,
  );
  const [selected, setSelected] = useState(start);
  const [jump, setJump] = useState({ date: start });
  const [span, setSpan] = useState(() => spanAround(start));
  const collapse = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const agenda = useRef<CalendarAgendaHandle>(null);
  const [mine, setMine] = useState(false);
  const { setDone } = useCalendarMutations(group);

  const monthList = monthsOf(span);
  // combine keeps the result stable between renders, so FlashList only sees new data when a month changes
  const { months, error } = useQueries({
    queries: monthList.map((month) => calendarRangeOptions(group.id, month)),
    combine: (results) => ({
      months: monthList.map((month, index) => {
        const data = results[index]?.data;
        return { month, range: data?.success ? data.data : undefined };
      }),
      error: results.flatMap(({ data }) =>
        data?.success === false ? [data.error] : [],
      )[0],
    }),
  });
  const range = months.find(({ month }) => month === monthOf(selected))?.range;

  useAnimatedReaction(
    () => collapse.value > MONTH_COVER / 2,
    (next, previous) => {
      if (previous !== null && next !== previous)
        scheduleOnRN(setCollapsed, next);
    },
  );

  const select = useCallback((date: string) => {
    setSelected(date);
    setSpan((current) => spanAround(date, current));
    setJump({ date });
  }, []);

  useEffect(() => {
    if (!jumpTo) return;
    if (
      jumpTo !== linkedOnMount.current &&
      calendarDateSchema.safeParse(jumpTo).success
    )
      select(jumpTo);
    linkedOnMount.current = undefined;
    router.setParams({ date: undefined });
  }, [jumpTo, router, select]);

  const openForm = () =>
    router.push({
      pathname: "/(tabs)/calendar/form",
      params: { date: selected },
    });

  return (
    <View className="flex-1">
      <View className="mb-4 flex-row items-center justify-between gap-2 px-4">
        <Text
          testID="calendar-heading"
          className="text-foreground text-3xl font-bold"
        >
          {t("title")}
        </Text>
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

      <MonthGrid
        range={range}
        selected={selected}
        today={today}
        collapsed={collapsed}
        onSelect={select}
        onStep={(delta) => select(stepFrom(selected, today, delta, collapsed))}
        banner={
          <DayHeading
            testID="calendar-current-day"
            date={selected}
            today={today}
            summary={daySummary(
              range ? entriesOn(range, selected) : [],
              people.meId,
            )}
          />
        }
        collapse={collapse}
        onToggleCollapsed={() => agenda.current?.toggleMonth()}
      >
        {error ? (
          <Text className="text-destructive p-4 text-center">
            {error.message}
          </Text>
        ) : (
          <CalendarAgenda
            ref={agenda}
            months={months}
            jump={jump}
            today={today}
            people={people}
            mine={mine}
            collapse={collapse}
            onScrolledTo={setSelected}
            onReachEdge={(month) =>
              setSpan((current) =>
                current.first === month
                  ? { ...current, first: shiftMonth(month, -1) }
                  : current.last === month
                    ? { ...current, last: shiftMonth(month, 1) }
                    : current,
              )
            }
            onToggle={(entry, done) =>
              setDone.mutate({
                groupId: group.id,
                itemId: entry.item.id,
                date: entry.occurrence.date,
                done,
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
        )}
      </MonthGrid>

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
