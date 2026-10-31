import type { DayRange } from "@flatsby/validators/expenses/list-filter";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocale } from "use-intl";

import {
  formatCalendarDate,
  monthGrid,
  monthOf,
  shiftMonth,
  weekdayName,
  weekdays,
} from "@flatsby/validators/calendar";

import { cn } from "~/lib/utils";

const MONTHS_BACK = 120;

export interface DayRangeDraft {
  from: string;
  to?: string;
}

export const nextDraft = (draft: DayRangeDraft | undefined, day: string) =>
  !draft || draft.to !== undefined || day < draft.from
    ? { from: day }
    : { from: draft.from, to: day };

export const draftRange = (draft: DayRangeDraft): DayRange => ({
  from: draft.from,
  to: draft.to ?? draft.from,
});

// The band starts and ends mid-cell, under the picked days' circles
function bandColumns(week: string[], month: string, draft?: DayRangeDraft) {
  if (draft?.to === undefined || draft.from === draft.to) return undefined;
  const { from, to } = draft;
  const covered = week.map(
    (day) => monthOf(day) === month && day >= from && day <= to,
  );
  const first = covered.indexOf(true);
  const last = covered.lastIndexOf(true);
  if (first < 0) return undefined;
  return {
    start: first + (week[first] === from ? 0.5 : 0),
    end: last + 1 - (week[last] === to ? 0.5 : 0),
  };
}

interface DayRangeGridProps {
  today: string;
  draft: DayRangeDraft | undefined;
  onPick: (day: string) => void;
}

export function DayRangeGrid({ today, draft, onPick }: DayRangeGridProps) {
  const locale = useLocale();
  const months = Array.from({ length: MONTHS_BACK }, (_, index) =>
    shiftMonth(monthOf(today), -index),
  );

  return (
    <View className="flex-1">
      <View className="border-border flex-row border-b px-3 pb-2">
        {weekdays.map((day) => (
          <Text
            key={day}
            className="text-muted-foreground flex-1 text-center text-xs font-semibold"
          >
            {weekdayName(day, locale, "short")}
          </Text>
        ))}
      </View>
      <FlashList
        data={months}
        extraData={draft}
        keyExtractor={(month) => month}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        renderItem={({ item: month }) => (
          <View className="px-3 pt-4">
            <Text className="text-foreground px-2 pb-2 text-sm font-bold">
              {formatCalendarDate(`${month}-01`, locale, {
                month: "long",
                year: "numeric",
              })}
            </Text>
            {monthGrid(month)
              .weeks.filter((week) =>
                week.some((day) => monthOf(day) === month),
              )
              .map((week) => {
                const band = bandColumns(week, month, draft);
                return (
                  <View key={week[0]} className="flex-row">
                    {band && (
                      <View
                        className="bg-muted absolute top-0 bottom-0"
                        style={{
                          left: `${(band.start / 7) * 100}%`,
                          width: `${((band.end - band.start) / 7) * 100}%`,
                        }}
                      />
                    )}
                    {week.map((day) => (
                      <DayCell
                        key={day}
                        day={day}
                        inMonth={monthOf(day) === month}
                        future={day > today}
                        today={day === today}
                        draft={draft}
                        onPick={onPick}
                      />
                    ))}
                  </View>
                );
              })}
          </View>
        )}
      />
    </View>
  );
}

function DayCell({
  day,
  inMonth,
  future,
  today,
  draft,
  onPick,
}: {
  day: string;
  inMonth: boolean;
  future: boolean;
  today: boolean;
  draft: DayRangeDraft | undefined;
  onPick: (day: string) => void;
}) {
  if (!inMonth) return <View className="h-10 flex-1" />;
  const end = draft?.to ?? draft?.from;
  const edge = day === draft?.from || day === end;
  const label = Number(day.slice(8));

  return (
    <Pressable
      testID={`expense-range-day-${day}`}
      disabled={future}
      onPress={() => onPick(day)}
      className="h-10 flex-1 items-center justify-center"
    >
      {edge ? (
        <View className="bg-primary size-9 items-center justify-center rounded-full">
          <Text className="text-primary-foreground text-sm font-semibold">
            {label}
          </Text>
        </View>
      ) : (
        <Text
          className={cn(
            "text-sm",
            future && "text-muted-foreground opacity-50",
            today && "text-primary font-bold",
            !future && !today && "text-foreground",
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
