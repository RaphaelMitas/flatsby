import type { AgendaDay } from "@flatsby/validators/calendar";
import { Text, View } from "react-native";
import { useLocale } from "use-intl";

import { formatCalendarDate } from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { cn } from "~/lib/utils";

const MAX_DOTS = 3;

export function WeekStrip({
  days,
  today,
}: {
  days: AgendaDay[];
  today: string;
}) {
  const locale = useLocale();

  return (
    <View className="mt-4 flex-row">
      {days.map(({ date, entries }) => {
        const isToday = date === today;
        return (
          <View key={date} className="flex-1 items-center">
            <Text className="text-muted-foreground text-xs font-medium">
              {formatCalendarDate(date, locale, { weekday: "short" })}
            </Text>
            <View
              className={cn(
                "mt-1 h-8 w-8 items-center justify-center rounded-full",
                isToday ? "bg-foreground" : "bg-card",
              )}
            >
              <Text
                className={cn(
                  "text-base font-semibold",
                  isToday ? "text-background" : "text-foreground",
                )}
              >
                {formatCalendarDate(date, locale, { day: "numeric" })}
              </Text>
            </View>
            <View className="mt-1 h-1.5 flex-row gap-1">
              {entries.slice(0, MAX_DOTS).map(({ item, occurrence }) => (
                <View
                  key={`${item.id}-${occurrence.date}`}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    categoryFillColorMap[item.color],
                  )}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
