import type {
  AgendaDay,
  AgendaEntry,
  CalendarEntry,
  DueChore,
} from "@flatsby/validators/calendar";
import type { KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { formatCalendarDate } from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { CalendarPeople } from "./CalendarPeople";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";
import { CalendarEntryRow } from "./CalendarEntryRow";

const MAX_DOTS = 4;

interface CalendarListProps {
  /** Undefined while loading */
  agenda: { days: AgendaDay[]; overdue: DueChore[] } | undefined;
  dates: string[];
  today: string;
  people: CalendarPeople;
  member: number | null;
  onRefresh: () => Promise<unknown>;
  onToggle: (entry: AgendaEntry, done: boolean) => void;
  onOpen: (entry: CalendarEntry) => void;
}

export function CalendarList({
  agenda,
  dates,
  today,
  people,
  member,
  onRefresh,
  onToggle,
  onOpen,
}: CalendarListProps) {
  const t = useTranslations("calendar");
  const scroller = useRef<KeyboardAwareScrollViewRef>(null);
  const sections = useRef(new Map<string, number>());

  const rows = (entries: AgendaEntry[]) => (
    <View className="border-border mx-4 overflow-hidden rounded-lg border">
      {entries.map((entry, index) => (
        <View
          key={`${entry.item.id}-${entry.occurrence.date}`}
          className={index > 0 ? "border-border border-t" : undefined}
        >
          <CalendarEntryRow
            entry={entry}
            people={people}
            today={today}
            onToggle={(done) => onToggle(entry, done)}
            onOpen={() => onOpen(entry)}
          />
        </View>
      ))}
    </View>
  );

  return (
    <>
      <View className="border-border flex-row border-b px-2 pb-2">
        {dates.map((date, index) => (
          <StripDay
            key={date}
            date={date}
            today={today}
            entries={agenda?.days[index]?.entries ?? []}
            onPress={() =>
              scroller.current?.scrollTo({
                // The first day goes to the very top, so the overdue chores above it show too
                y: date === dates[0] ? 0 : (sections.current.get(date) ?? 0),
                animated: true,
              })
            }
          />
        ))}
      </View>

      <AppScrollView
        ref={scroller}
        testID="calendar-agenda"
        contentContainerClassName="pb-28"
        onRefresh={onRefresh}
      >
        {!agenda ? (
          <View className="gap-4 p-4">
            {dates.map((date) => (
              <Skeleton key={date} className="h-5 w-40 rounded" />
            ))}
          </View>
        ) : (
          <>
            {agenda.overdue.length > 0 && (
              <View testID="calendar-overdue">
                <Text className="text-destructive px-4 pt-4 pb-2 text-lg font-bold">
                  {t("overdue")}
                </Text>
                {rows(agenda.overdue)}
              </View>
            )}
            {agenda.days.map(({ date, entries, summary }) => (
              <View
                key={date}
                testID={`calendar-agenda-${date === today ? "today" : date}`}
                onLayout={(event) =>
                  sections.current.set(date, event.nativeEvent.layout.y)
                }
              >
                <DayHeading
                  date={date}
                  today={today}
                  summary={entries.length > 0 ? summary : undefined}
                  empty={
                    entries.length === 0 &&
                    (member === people.meId
                      ? t("nothingOnYou")
                      : t("nothingPlanned"))
                  }
                />
                {entries.length > 0 && rows(entries)}
              </View>
            ))}
          </>
        )}
      </AppScrollView>
    </>
  );
}

function DayHeading({
  date,
  today,
  summary,
  empty,
}: {
  date: string;
  today: string;
  summary: AgendaDay["summary"] | undefined;
  empty: string | false;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  return (
    <View
      className={cn(
        "flex-row items-baseline gap-2 px-4",
        empty ? "py-2" : "pt-4 pb-2",
      )}
    >
      <Text
        className={cn(
          "text-foreground text-lg font-bold",
          empty && "text-base opacity-60",
        )}
      >
        {date === today
          ? t("today")
          : formatCalendarDate(date, locale, { weekday: "long" })}
      </Text>
      <Text className="text-muted-foreground text-sm font-medium">
        {formatCalendarDate(date, locale, { day: "numeric", month: "long" })}
      </Text>
      {empty && <Text className="text-muted-foreground text-sm">{empty}</Text>}
      {summary && summary.total > 0 && (
        <Text
          testID="calendar-day-progress"
          className="text-muted-foreground ml-auto text-sm"
        >
          {t("dayProgress", summary)}
          {summary.onYou > 0 && ` · ${t("onYou", { count: summary.onYou })}`}
        </Text>
      )}
    </View>
  );
}

function StripDay({
  date,
  today,
  entries,
  onPress,
}: {
  date: string;
  today: string;
  entries: CalendarEntry[];
  onPress: () => void;
}) {
  const locale = useLocale();
  const isToday = date === today;
  return (
    <Pressable
      testID={`calendar-day-${date}`}
      accessibilityRole="button"
      accessibilityLabel={formatCalendarDate(date, locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}
      onPress={onPress}
      className="flex-1 items-center gap-0.5 py-1"
    >
      <Text className="text-muted-foreground text-xs font-semibold uppercase">
        {formatCalendarDate(date, locale, { weekday: "short" })}
      </Text>
      <View
        className={cn(
          "h-8 w-8 items-center justify-center rounded-full",
          // Android drops the radius when a background appears from none (react-native#52415)
          isToday ? "bg-primary" : "bg-background",
        )}
      >
        <Text
          className={cn(
            "text-base font-semibold",
            isToday ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {Number(date.slice(8))}
        </Text>
      </View>
      <View className="h-1.5 flex-row gap-0.5">
        {entries.slice(0, MAX_DOTS).map(({ item, occurrence }) => (
          <View
            key={item.id}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              categoryFillColorMap[item.color],
              occurrence.completedAt && "opacity-25",
            )}
          />
        ))}
      </View>
    </Pressable>
  );
}
