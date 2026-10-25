import type { AgendaDay, AgendaEntry } from "@flatsby/validators/calendar";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocale } from "use-intl";

import {
  formatCalendarDate,
  monthGrid,
  monthOf,
  monthWeeks,
  timesMissed,
} from "@flatsby/validators/calendar";
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
  today: string;
  onSelect: (date: string) => void;
}

export function MonthGrid({ month, days, today, onSelect }: MonthGridProps) {
  const locale = useLocale();
  const { weeks } = monthGrid(month);
  const [height, setHeight] = useState(0);
  const lines = Math.max(
    1,
    Math.floor((height / WEEKS - DATE_HEIGHT) / LINE_HEIGHT),
  );
  const layout = days && monthWeeks(days, lines);

  return (
    <View className="border-border flex-1 border-t pb-16">
      <View className="border-border flex-row border-b">
        {weeks[0]?.map((date) => (
          <Text
            key={date}
            className="text-muted-foreground flex-1 py-1 text-center text-xs font-semibold uppercase"
          >
            {formatCalendarDate(date, locale, { weekday: "short" })}
          </Text>
        ))}
      </View>
      <View
        className="flex-1"
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {weeks.map((week, weekIndex) => (
          <View
            key={week[0]}
            className="flex-row"
            style={{ height: height / WEEKS }}
          >
            {week.map((date, column) => {
              const cell = layout?.[weekIndex]?.cells[column];
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
                    column !== 6 && "border-r",
                    monthOf(date) !== month ? "bg-muted/40" : "bg-background",
                  )}
                  style={{ width: `${100 / 7}%` }}
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
                  {cell?.slots.map((entry, lane) =>
                    entry ? (
                      <MonthEntry
                        key={`${entry.item.id}-${entry.occurrence.date}`}
                        entry={entry}
                        today={today}
                      />
                    ) : (
                      <View key={lane} style={{ height: LINE_HEIGHT - 1 }} />
                    ),
                  )}
                  {!!cell?.hidden && (
                    <Text className="text-muted-foreground px-0.5 text-xs">
                      +{cell.hidden}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            {layout?.[weekIndex]?.bars.map(
              ({ entry, column, span, lane, startsBefore, endsAfter }) => (
                <View
                  key={`${entry.item.id}-${entry.occurrence.date}`}
                  pointerEvents="none"
                  className="absolute px-0.5"
                  style={{
                    left: `${(100 * column) / 7}%`,
                    width: `${(100 * span) / 7}%`,
                    top: DATE_HEIGHT + 1 + lane * LINE_HEIGHT,
                  }}
                >
                  <MonthEntry
                    entry={entry}
                    today={today}
                    continued={startsBefore}
                    className={cn(
                      startsBefore && "rounded-l-none",
                      endsAfter && "rounded-r-none",
                    )}
                  />
                </View>
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthEntry({
  entry,
  today,
  continued = false,
  className,
}: {
  entry: AgendaEntry;
  today: string;
  continued?: boolean;
  className?: string;
}) {
  const { item, occurrence } = entry;
  if (item.kind === "event")
    return (
      <Text
        numberOfLines={1}
        className={cn(
          "rounded-sm px-0.5 text-xs font-medium",
          categoryBgColorMap[item.color],
          categoryTextColorMap[item.color].default,
          className,
        )}
        style={{ lineHeight: LINE_HEIGHT - 1 }}
      >
        {item.time && !continued ? `${item.time.start} ` : ""}
        {item.title}
      </Text>
    );
  const done = occurrence.completedAt !== null;
  return (
    <View
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
            : timesMissed(entry, today) > 0
              ? "text-destructive"
              : "text-foreground",
        )}
      >
        {item.title}
      </Text>
    </View>
  );
}
