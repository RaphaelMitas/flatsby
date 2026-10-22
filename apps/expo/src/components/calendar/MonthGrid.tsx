import type { CalendarRange } from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import { memo, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useLocale, useTranslations } from "use-intl";

import {
  addDays,
  entriesOn,
  formatCalendarDate,
  monthGrid,
  monthOf,
  weekDays,
  weekStart,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";

const MAX_DOTS = 3;
const WEEK_HEIGHT = 42;
const WEEK_PADDING = 6;
const WEEKS = 6;
const WEEKS_EACH_WAY = 520;

/** How far the open month reaches over the agenda; scrolling that far closes it. */
export const MONTH_COVER = (WEEKS - 1) * WEEK_HEIGHT;

interface MonthGridProps {
  rangeOf: (date: string) => CalendarRange | undefined;
  selected: string;
  today: string;
  /** 0 is the open month, MONTH_COVER the single week; the agenda's scrolling drives it. */
  collapse: SharedValue<number>;
  collapsed: boolean;
  onSelect: (date: string) => void;
  onStep: (delta: number) => void;
  onToggleCollapsed: () => void;
  /** Pinned under the weeks and moves with them as the month opens and closes. */
  banner: ReactNode;
  /** Starts one week below the header; the open month lies on top of it, so collapsing never moves it. */
  children: ReactNode;
}

export function MonthGrid({
  rangeOf,
  selected,
  today,
  collapse,
  collapsed,
  onSelect,
  onStep,
  onToggleCollapsed,
  banner,
  children,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const month = monthOf(selected);
  const { weeks } = monthGrid(month);
  const selectedWeek = weeks.findIndex((week) => week.includes(selected));
  const [closed, setClosed] = useState(false);

  useAnimatedReaction(
    () => collapse.value >= MONTH_COVER - 1,
    (next, previous) => {
      if (previous !== null && next !== previous) scheduleOnRN(setClosed, next);
    },
  );

  const clipStyle = useAnimatedStyle(() => ({
    height: WEEK_HEIGHT * WEEKS - collapse.value,
  }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (-WEEK_HEIGHT * selectedWeek * collapse.value) / MONTH_COVER,
      },
    ],
  }));

  return (
    <View className="flex-1">
      <View className="mb-2 h-10 flex-row items-center justify-between px-4">
        <Pressable
          testID="calendar-grid-toggle"
          accessibilityRole="button"
          accessibilityLabel={collapsed ? t("showMonth") : t("showWeek")}
          accessibilityState={{ expanded: !collapsed }}
          onPress={onToggleCollapsed}
          className="flex-row items-center gap-1"
        >
          <Text
            testID="calendar-month-title"
            className="text-foreground text-lg font-semibold"
          >
            {formatCalendarDate(`${month}-01`, locale, {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Icon
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={18}
            color="muted-foreground"
          />
        </Pressable>
        <View className="flex-row items-center gap-1">
          {selected !== today && (
            <Button
              testID="calendar-today-button"
              variant="outline"
              size="sm"
              title={t("today")}
              onPress={() => onSelect(today)}
            />
          )}
          <Button
            testID="calendar-previous-month"
            variant="ghost"
            size="sm"
            icon="chevron-left"
            accessibilityLabel={
              collapsed ? t("previousWeek") : t("previousMonth")
            }
            onPress={() => onStep(-1)}
          />
          <Button
            testID="calendar-next-month"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            accessibilityLabel={collapsed ? t("nextWeek") : t("nextMonth")}
            onPress={() => onStep(1)}
          />
        </View>
      </View>

      <View className="flex-row px-4">
        {weeks[0]?.map((day) => (
          <Text
            key={day}
            className="text-muted-foreground flex-1 pb-1.5 text-center text-xs font-semibold uppercase"
          >
            {formatCalendarDate(day, locale, {
              weekday: "short",
            })}
          </Text>
        ))}
      </View>

      <View className="flex-1">
        <View
          className="flex-1"
          style={{ paddingTop: WEEK_HEIGHT + 2 * WEEK_PADDING }}
        >
          {children}
        </View>
        <View className="absolute top-0 right-0 left-0">
          <View
            className="bg-background border-border border-b px-4"
            style={{ paddingVertical: WEEK_PADDING }}
          >
            <Animated.View style={clipStyle} className="overflow-hidden">
              <Animated.View style={slideStyle}>
                {weeks.map((week, index) => {
                  const hidden = collapsed && index !== selectedWeek;
                  return (
                    <View
                      key={week[0]}
                      accessibilityElementsHidden={hidden}
                      importantForAccessibility={
                        hidden ? "no-hide-descendants" : "auto"
                      }
                    >
                      <WeekRow
                        days={week}
                        month={month}
                        selected={selectedIn(week, selected)}
                        today={today}
                        rangeOf={rangeOf}
                        onSelect={onSelect}
                      />
                    </View>
                  );
                })}
              </Animated.View>
            </Animated.View>
            <WeekStrip
              selected={selected}
              today={today}
              month={month}
              rangeOf={rangeOf}
              closed={closed}
              onSelect={onSelect}
            />
          </View>
          {banner}
        </View>
      </View>
    </View>
  );
}

interface WeekRowProps {
  days: string[];
  month: string;
  /** Only for the row that holds it, so a new selection re-renders two rows instead of all of them. */
  selected: string | undefined;
  today: string;
  rangeOf: (date: string) => CalendarRange | undefined;
  onSelect: (date: string) => void;
}

const selectedIn = (days: string[], selected: string) =>
  days.includes(selected) ? selected : undefined;

const WeekRow = memo(function WeekRow({
  days,
  month,
  selected,
  today,
  rangeOf,
  onSelect,
}: WeekRowProps) {
  const locale = useLocale();
  return (
    <View className="flex-row" style={{ height: WEEK_HEIGHT }}>
      {days.map((day) => {
        const isSelected = day === selected;
        const range = rangeOf(day);
        const entries = range ? entriesOn(range, day).slice(0, MAX_DOTS) : [];
        return (
          <Pressable
            key={day}
            testID={`calendar-day-${day}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={formatCalendarDate(day, locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            onPress={() => onSelect(day)}
            className="flex-1 items-center justify-center gap-1"
          >
            <View
              className={cn(
                "h-8 w-8 items-center justify-center rounded-full",
                // Android drops the radius when a background appears from none (react-native#52415)
                isSelected ? "bg-primary" : "bg-background",
              )}
            >
              <Text
                className={cn(
                  "text-foreground text-base",
                  monthOf(day) !== month && "opacity-40",
                  day === today && "text-destructive font-bold",
                  isSelected && "text-primary-foreground font-bold",
                )}
              >
                {Number(day.slice(8))}
              </Text>
            </View>
            <View className="h-1.5 flex-row gap-0.5">
              {entries.map(({ item, occurrence }) => (
                <View
                  key={`${item.id}-${occurrence.date}`}
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
      })}
    </View>
  );
});

const weeksAround = (date: string) => {
  const first = addDays(weekStart(date), -7 * WEEKS_EACH_WAY);
  return Array.from({ length: 2 * WEEKS_EACH_WAY + 1 }, (_, index) =>
    weekDays(addDays(first, 7 * index)),
  );
};

/** Lies over the closed month's week. */
function WeekStrip({
  closed,
  ...row
}: Omit<WeekRowProps, "days" | "selected"> & {
  selected: string;
  closed: boolean;
}) {
  const { selected, today, onSelect } = row;
  const list = useRef<FlatList<string[]>>(null);
  const [width, setWidth] = useState(0);
  // Re-centred only when the selection leaves it, so midnight can't shift every page under the finger
  const [weeks, setWeeks] = useState(() => weeksAround(today));
  const start = weekStart(selected);
  const index = weeks.findIndex((days) => days[0] === start);
  if (index < 0) setWeeks(weeksAround(start));

  // Only a finger picks a week; our own scrolls pass pages nobody chose
  const swiping = useRef(false);
  const land = (page: number) => {
    if (!swiping.current) return;
    swiping.current = false;
    if (page !== index) onSelect(addDays(selected, 7 * (page - index)));
  };
  const landIfSnapped = (x: number) => {
    const page = Math.round(x / width);
    if (Math.abs(x - page * width) < 1) land(page);
  };

  useEffect(() => {
    swiping.current = false;
    if (index >= 0) list.current?.scrollToIndex({ index, animated: closed });
  }, [index, closed]);

  return (
    <View
      className="bg-background absolute right-4 left-4"
      style={{
        top: WEEK_PADDING,
        height: WEEK_HEIGHT,
        opacity: closed ? 1 : 0,
        pointerEvents: closed ? "auto" : "none",
      }}
      // The month grid under it carries the same days for screen readers
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <FlatList
          ref={list}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={weeks}
          extraData={row}
          keyExtractor={(days) => days[0] ?? ""}
          getItemLayout={(_, page) => ({
            length: width,
            offset: width * page,
            index: page,
          })}
          initialScrollIndex={Math.max(index, 0)}
          initialNumToRender={1}
          windowSize={3}
          renderItem={({ item: days }) => (
            <View style={{ width }}>
              <WeekRow
                {...row}
                days={days}
                selected={selectedIn(days, selected)}
              />
            </View>
          )}
          // A finger catching a snap gets no momentum end, so each drag starts over
          onScrollBeginDrag={() => {
            swiping.current = false;
          }}
          // A slow drag passes page edges too; only where the strip settles after release counts
          onScrollEndDrag={(event) => {
            swiping.current = true;
            landIfSnapped(event.nativeEvent.contentOffset.x);
          }}
          scrollEventThrottle={16}
          // Android reports the end of a page snap late, so land once the strip rests on a week
          onScroll={(event) => landIfSnapped(event.nativeEvent.contentOffset.x)}
          onMomentumScrollEnd={(event) =>
            land(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        />
      )}
    </View>
  );
}
