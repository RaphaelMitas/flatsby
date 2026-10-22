import type { CalendarRange } from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useLocale, useTranslations } from "use-intl";

import {
  entriesOn,
  formatCalendarDate,
  monthGrid,
  monthOf,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";

const MAX_DOTS = 3;
const WEEK_HEIGHT = 42;
const WEEK_PADDING = 6;
const WEEKS = 6;

/** How far the open month reaches over the agenda; scrolling that far closes it. */
export const MONTH_COVER = (WEEKS - 1) * WEEK_HEIGHT;

interface MonthGridProps {
  range: CalendarRange | undefined;
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
  range,
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
  const { days } = monthGrid(month);
  const weeks = Array.from({ length: WEEKS }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
  const selectedWeek = Math.floor(days.indexOf(selected) / 7);

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
                      className="flex-row"
                      style={{ height: WEEK_HEIGHT }}
                      accessibilityElementsHidden={hidden}
                      importantForAccessibility={
                        hidden ? "no-hide-descendants" : "auto"
                      }
                    >
                      {week.map((day) => {
                        const isSelected = day === selected;
                        const entries = range
                          ? entriesOn(range, day).slice(0, MAX_DOTS)
                          : [];
                        return (
                          <Pressable
                            key={day}
                            testID={`calendar-day-${day}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={formatCalendarDate(
                              day,
                              locale,
                              {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
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
                                  isSelected &&
                                    "text-primary-foreground font-bold",
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
                })}
              </Animated.View>
            </Animated.View>
          </View>
          {banner}
        </View>
      </View>
    </View>
  );
}
