import type { AgendaMonth } from "@flatsby/api/calendarCache";
import type {
  AgendaDay,
  CalendarEntry,
  CalendarRange,
} from "@flatsby/validators/calendar";
import type { FlashListRef } from "@shopify/flash-list";
import type { ComponentType, Ref, RefAttributes } from "react";
import type { SharedValue } from "react-native-reanimated";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Text, View } from "react-native";
import {
  useAnimatedReaction,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { FlashList } from "@shopify/flash-list";
import { useLocale, useTranslations } from "use-intl";

import { agendaDays, formatCalendarDate } from "@flatsby/validators/calendar";

import type { CalendarPeople } from "./CalendarPeople";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";
import { CalendarEntryRow } from "./CalendarEntryRow";
import { MONTH_COVER } from "./MonthGrid";

type AgendaRow =
  | { type: "day"; date: string; summary: AgendaDay["summary"] }
  | {
      type: "entry";
      date: string;
      entry: CalendarEntry;
      first: boolean;
      last: boolean;
    }
  | { type: "empty" | "loading"; date: string };

const rowsByRange = new WeakMap<CalendarRange, Map<string, AgendaRow[]>>();

/** A loaded month keeps its rows while its range is unchanged, so a neighbour arriving doesn't re-render every visible row. */
function monthRows(
  month: string,
  range: CalendarRange | undefined,
  meId: number,
  mine: boolean,
): AgendaRow[] {
  const key = `${month} ${meId} ${mine}`;
  const cached = range && rowsByRange.get(range)?.get(key);
  if (cached) return cached;
  const rows = agendaDays(range, month, meId, mine).flatMap(
    ({ date, summary, entries }): AgendaRow[] => [
      { type: "day", date, summary },
      ...(!range
        ? [{ type: "loading" as const, date }]
        : entries.length === 0
          ? [{ type: "empty" as const, date }]
          : entries.map((entry, index) => ({
              type: "entry" as const,
              date,
              entry,
              first: index === 0,
              last: index === entries.length - 1,
            }))),
    ],
  );
  if (range)
    rowsByRange.set(
      range,
      (rowsByRange.get(range) ?? new Map()).set(key, rows),
    );
  return rows;
}
const DAY_HEADING_HEIGHT = 60;
// A month still loading keeps the height of an empty day, the most common row, so its arrival rarely moves anything
const EMPTY_ROW_HEIGHT = 28;
const MAX_SPEED_CHANGE = 60;

// Reanimated reads scroll offsets through getScrollableNode, which FlashList exposes
interface Scrollable {
  getScrollableNode: () => unknown;
}

export interface CalendarAgendaHandle {
  /** Scrolls by the rest of the way, so the month opens or closes with the list instead of over it. */
  toggleMonth: () => void;
  /** Stops scrolling from picking the day until the next drag. */
  freeze: () => void;
}

interface CalendarAgendaProps {
  ref: Ref<CalendarAgendaHandle>;
  months: AgendaMonth[];
  /** A new object scrolls the agenda to its date, even the same date again. */
  jump: { date: string };
  today: string;
  people: CalendarPeople;
  mine: boolean;
  collapse: SharedValue<number>;
  onScrolledTo: (date: string) => void;
  onReachEdge: (month: string) => void;
  onToggle: (entry: CalendarEntry, done: boolean) => void;
  onOpen: (entry: CalendarEntry) => void;
}

export function CalendarAgenda({
  ref,
  months,
  jump,
  today,
  people,
  mine,
  collapse,
  onScrolledTo,
  onReachEdge,
  onToggle,
  onOpen,
}: CalendarAgendaProps) {
  const t = useTranslations("calendar");
  const list = useRef<FlashListRef<AgendaRow>>(null);
  const scrollable = useAnimatedRef<ComponentType<RefAttributes<Scrollable>>>();
  const offset = useScrollOffset(scrollable);
  // Jumps and corrections at rest scroll too; only the person's scrolling moves the month
  const frozen = useSharedValue(true);
  // The same flag for this thread, where a set on the shared value only lands after the UI thread applies it
  const frozenHere = useRef(true);
  const setFrozen = useCallback(
    (value: boolean) => {
      frozen.set(value);
      frozenHere.current = value;
    },
    [frozen],
  );
  const handledJump = useRef(jump);
  const lastY = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const rows = useMemo(
    () =>
      months.flatMap(({ month, range }) =>
        monthRows(month, range, people.meId, mine),
      ),
    [months, people.meId, mine],
  );
  const dayIndices = useMemo(
    () => rows.flatMap((row, index) => (row.type === "day" ? [index] : [])),
    [rows],
  );
  const jumpIndex = rows.findIndex(
    (row) => row.type === "day" && row.date === jump.date,
  );

  const onFrame = (y: number, collapsed: number) => {
    lastY.current = y;
    if (frozenHere.current) return;
    // A day owns the pinned heading once its own heading is half under it
    const visibleTop = y + MONTH_COVER - collapsed + DAY_HEADING_HEIGHT / 2;
    for (let i = dayIndices.length - 1; i >= 0; i--) {
      const index = dayIndices[i] ?? 0;
      const top = list.current?.getLayout(index)?.y;
      if (top !== undefined && top < visibleTop) {
        const row = rows[index];
        if (row) onScrolledTo(row.date);
        return;
      }
    }
  };

  const lastStep = useSharedValue(0);
  useAnimatedReaction(
    () => offset.get(),
    (y, previous) => {
      const step = previous === null ? 0 : y - previous;
      // FlashList keeps its place by shifting the offset in one frame when rows above change; no finger changes speed that fast
      const correction = Math.abs(step - lastStep.get()) > MAX_SPEED_CHANGE;
      if (!correction) lastStep.set(step);
      if (!frozen.get() && !correction)
        collapse.set(Math.min(MONTH_COVER, Math.max(0, collapse.get() + step)));
      // Offset and collapse from the same frame, so the day on screen can't lag a frame behind
      scheduleOnRN(onFrame, y, collapse.get());
    },
  );

  useEffect(() => {
    if (handledJump.current === jump || jumpIndex < 0) return;
    handledJump.current = jump;
    setFrozen(true);
    void list.current?.scrollToIndex({
      index: jumpIndex,
      animated: false,
      // FlashList adds viewOffset to the scroll position, so a gap above the day is negative
      viewOffset: -(MONTH_COVER - collapse.get()),
    });
  }, [jump, jumpIndex, setFrozen, collapse]);

  const scrollBy = (distance: number) => {
    setFrozen(false);
    lastStep.set(0);
    list.current?.scrollToOffset({
      offset: lastY.current + distance,
      animated: true,
    });
  };

  useImperativeHandle(ref, () => ({
    toggleMonth: () => {
      const rest = collapse.get();
      scrollBy(rest > MONTH_COVER / 2 ? -rest : MONTH_COVER - rest);
    },
    freeze: () => setFrozen(true),
  }));

  const settle = () => {
    const rest = collapse.get();
    if (rest <= 0 || rest >= MONTH_COVER) {
      setFrozen(true);
      return;
    }
    scrollBy(rest > MONTH_COVER / 2 ? MONTH_COVER - rest : -rest);
  };

  const renderItem = ({ item: row }: { item: AgendaRow }) => {
    switch (row.type) {
      case "day":
        return (
          <DayHeading date={row.date} today={today} summary={row.summary} />
        );
      case "entry":
        return (
          <View
            className={cn(
              "border-border mx-4 border-t border-r border-l",
              row.first && "rounded-t-lg",
              row.last && "mb-2 rounded-b-lg border-b",
            )}
          >
            <CalendarEntryRow
              entry={row.entry}
              people={people}
              today={today}
              onToggle={(done) => onToggle(row.entry, done)}
              onOpen={() => onOpen(row.entry)}
            />
          </View>
        );
      case "empty":
        return (
          <View
            className="justify-center px-4"
            style={{ height: EMPTY_ROW_HEIGHT }}
          >
            <Text className="text-muted-foreground text-sm">
              {mine ? t("nothingOnYou") : t("nothingPlanned")}
            </Text>
          </View>
        );
      case "loading":
        return (
          <View
            className="justify-center px-4"
            style={{ height: EMPTY_ROW_HEIGHT }}
          >
            <Skeleton className="h-4 w-32 rounded" />
          </View>
        );
    }
  };

  return (
    <FlashList
      ref={(instance) => {
        list.current = instance;
        scrollable(instance);
      }}
      testID="calendar-agenda"
      data={rows}
      renderItem={renderItem}
      // FlashList estimates unseen rows by type; one height per type spares it corrections mid-fling
      getItemType={(row) =>
        row.type === "entry"
          ? `entry-${Number(row.first)}${Number(row.last)}`
          : row.type
      }
      keyExtractor={(row) =>
        row.type === "entry"
          ? `${row.entry.item.id}-${row.date}`
          : `${row.type}-${row.date}`
      }
      initialScrollIndex={Math.max(jumpIndex, 0)}
      initialScrollIndexParams={{ viewOffset: -MONTH_COVER }}
      onScrollBeginDrag={() => {
        clearTimeout(settleTimer.current);
        setFrozen(false);
        // A finger stopping a fling starts from rest, not from the fling's speed
        lastStep.set(0);
      }}
      // A release without a fling still settles the month, once no momentum follows
      onScrollEndDrag={() => {
        settleTimer.current = setTimeout(settle, 60);
      }}
      onMomentumScrollBegin={() => clearTimeout(settleTimer.current)}
      onMomentumScrollEnd={settle}
      onStartReached={() => {
        const first = months[0]?.month;
        if (first) onReachEdge(first);
      }}
      onStartReachedThreshold={2}
      onEndReached={() => {
        const last = months.at(-1)?.month;
        if (last) onReachEdge(last);
      }}
      onEndReachedThreshold={2}
      contentContainerClassName="pb-28"
    />
  );
}

/** Fixed height, so a heading scrolling under the pinned one disappears exactly behind it. */
export function DayHeading({
  date,
  today,
  summary,
  testID,
}: {
  date: string;
  today: string;
  summary: AgendaDay["summary"];
  testID?: string;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  return (
    <View
      testID={testID ?? `calendar-agenda-${date === today ? "today" : date}`}
      className="bg-background justify-center px-4"
      style={{ height: DAY_HEADING_HEIGHT }}
    >
      <View className="flex-row items-baseline gap-2">
        <Text className="text-foreground text-lg font-bold">
          {date === today
            ? t("today")
            : formatCalendarDate(date, locale, { weekday: "long" })}
        </Text>
        <Text className="text-muted-foreground text-sm font-medium">
          {formatCalendarDate(date, locale, { day: "numeric", month: "long" })}
        </Text>
      </View>
      {summary.total > 0 && (
        <Text
          testID="calendar-day-progress"
          className="text-muted-foreground text-sm"
        >
          {t("dayProgress", summary)}
          {summary.onYou > 0 && ` · ${t("onYou", { count: summary.onYou })}`}
        </Text>
      )}
    </View>
  );
}
