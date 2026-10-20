import type { CalendarRange } from "@flatsby/validators/calendar";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  entriesOn,
  formatCalendarDate,
  monthOf,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { Button } from "~/lib/ui/button";
import { cn } from "~/lib/utils";

const MAX_DOTS = 3;

interface MonthGridProps {
  month: string;
  days: string[];
  range: CalendarRange | undefined;
  selected: string;
  today: string;
  onSelect: (date: string) => void;
  onShiftMonth: (delta: number) => void;
}

export function MonthGrid({
  month,
  days,
  range,
  selected,
  today,
  onSelect,
  onShiftMonth,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const weeks = Array.from({ length: days.length / 7 }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
  const showToday = selected !== today || month !== monthOf(today);

  return (
    <View>
      <View className="mb-2 h-10 flex-row items-center justify-between">
        <Text
          testID="calendar-month-title"
          className="text-foreground text-lg font-semibold"
        >
          {formatCalendarDate(`${month}-01`, locale, {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <View className="flex-row items-center gap-1">
          {showToday && (
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
            accessibilityLabel={t("previousMonth")}
            onPress={() => onShiftMonth(-1)}
          />
          <Button
            testID="calendar-next-month"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            accessibilityLabel={t("nextMonth")}
            onPress={() => onShiftMonth(1)}
          />
        </View>
      </View>

      <View className="flex-row">
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

      {weeks.map((week) => (
        <View key={week[0]} className="flex-row">
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
                accessibilityLabel={formatCalendarDate(day, locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                onPress={() => onSelect(day)}
                className="h-12 flex-1 items-center gap-1 pt-1"
              >
                <View
                  className={cn(
                    "h-8 w-8 items-center justify-center rounded-full",
                    isSelected && "bg-primary",
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
      ))}
    </View>
  );
}
