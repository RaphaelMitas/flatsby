import type { AgendaDay } from "@flatsby/validators/calendar";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale } from "use-intl";

import { formatCalendarDate, monthOf } from "@flatsby/validators/calendar";
import {
  categoryBgColorMap,
  categoryFillColorMap,
  categoryTextColorMap,
} from "@flatsby/validators/expenses/category-colors";

import { cn } from "~/lib/utils";

const WEEKS = 6;
const DATE_HEIGHT = 24;
const LINE_HEIGHT = 15;

interface MonthGridProps {
  month: string;
  /** Undefined while loading */
  days: AgendaDay[] | undefined;
  dates: string[];
  today: string;
  onSelect: (date: string) => void;
}

export function MonthGrid({
  month,
  days,
  dates,
  today,
  onSelect,
}: MonthGridProps) {
  const locale = useLocale();
  const [height, setHeight] = useState(0);
  const lines = Math.max(
    1,
    Math.floor((height / WEEKS - DATE_HEIGHT) / LINE_HEIGHT),
  );

  return (
    <View className="border-border flex-1 border-t pb-16">
      <View className="border-border flex-row border-b">
        {dates.slice(0, 7).map((date) => (
          <Text
            key={date}
            className="text-muted-foreground flex-1 py-1 text-center text-xs font-semibold uppercase"
          >
            {formatCalendarDate(date, locale, { weekday: "short" })}
          </Text>
        ))}
      </View>
      <View
        className="flex-1 flex-row flex-wrap"
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {dates.map((date, index) => {
          const entries = days?.find((day) => day.date === date)?.entries ?? [];
          const shown =
            entries.length > lines ? entries.slice(0, lines - 1) : entries;
          return (
            <Pressable
              key={date}
              testID={`calendar-day-${date}`}
              accessibilityRole="button"
              accessibilityLabel={formatCalendarDate(date, locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              onPress={() => onSelect(date)}
              className={cn(
                "border-border active:bg-muted gap-px overflow-hidden border-b px-0.5",
                index % 7 !== 6 && "border-r",
                monthOf(date) !== month ? "bg-muted/40" : "bg-background",
              )}
              style={{ width: `${100 / 7}%`, height: height / WEEKS }}
            >
              <View
                className="items-center justify-center"
                style={{ height: DATE_HEIGHT }}
              >
                <View
                  className={cn(
                    "h-5 min-w-5 items-center justify-center rounded-full px-1",
                    date === today ? "bg-primary" : "bg-transparent",
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold",
                      date === today
                        ? "text-primary-foreground"
                        : monthOf(date) === month
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
              </View>
              {shown.map(({ item, occurrence }) => {
                const done = occurrence.completedAt !== null;
                const key = `${item.id}-${occurrence.date}`;
                if (item.kind === "event")
                  return (
                    <Text
                      key={key}
                      numberOfLines={1}
                      className={cn(
                        "rounded-sm px-0.5 text-xs font-medium",
                        categoryBgColorMap[item.color],
                        categoryTextColorMap[item.color].default,
                      )}
                      style={{ lineHeight: LINE_HEIGHT - 1 }}
                    >
                      {item.time ? `${item.time.start} ` : ""}
                      {item.title}
                    </Text>
                  );
                return (
                  <View
                    key={key}
                    className="flex-row items-center gap-0.5"
                    style={{ height: LINE_HEIGHT - 1 }}
                  >
                    <View
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        categoryFillColorMap[item.color],
                        done && "opacity-25",
                      )}
                    />
                    <Text
                      numberOfLines={1}
                      className={cn(
                        "flex-1 text-xs",
                        done
                          ? "text-muted-foreground line-through"
                          : date < today
                            ? "text-destructive"
                            : "text-foreground",
                      )}
                    >
                      {item.title}
                    </Text>
                  </View>
                );
              })}
              {shown.length < entries.length && (
                <Text className="text-muted-foreground px-0.5 text-xs">
                  +{entries.length - shown.length}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
