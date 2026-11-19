import { Text, View } from "react-native";
import { useLocale } from "use-intl";

import { formatCalendarDate } from "@flatsby/validators/calendar";
import { barHeights } from "@flatsby/validators/statistics";

import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";

const LABEL_ROW = 20;
const INSIDE_LABEL_MIN_HEIGHT = 22;

interface MonthBar {
  month: string;
  total: number;
  filled?: number;
}

export function MonthBars({
  bars,
  height,
  format,
}: {
  bars: MonthBar[] | undefined;
  height: number;
  format: (value: number) => string;
}) {
  const locale = useLocale();

  if (!bars)
    return (
      <Skeleton
        className="bg-foreground/10 mt-4 rounded-xl"
        style={{ height: height + 2 * LABEL_ROW }}
      />
    );

  const heights = barHeights(
    bars.map(({ total }) => total),
    height,
  );

  return (
    <View className="mt-4 flex-row">
      {bars.map(({ month, total, filled }, index) => {
        const last = index === bars.length - 1;
        const barHeight = heights[index] ?? 0;
        const filledHeight =
          filled === undefined || total === 0
            ? barHeight
            : (barHeight * filled) / total;
        return (
          <View key={month} className="flex-1 items-center">
            <View
              className="items-center justify-end"
              style={{ height: height + LABEL_ROW }}
            >
              <Text
                className={cn(
                  "mb-1 text-xs font-medium",
                  last ? "text-foreground font-bold" : "text-muted-foreground",
                )}
              >
                {format(total)}
              </Text>
              <View
                className="bg-border w-9 justify-end overflow-hidden rounded-lg"
                style={{ height: barHeight }}
              >
                <View
                  className={cn(
                    "items-center pt-1",
                    last ? "bg-foreground" : "bg-muted-foreground",
                  )}
                  style={{ height: filledHeight }}
                >
                  {filled !== undefined &&
                    filledHeight >= INSIDE_LABEL_MIN_HEIGHT && (
                      <Text className="text-background text-xs font-bold">
                        {format(filled)}
                      </Text>
                    )}
                </View>
              </View>
            </View>
            <Text
              className={cn(
                "mt-1 text-xs font-medium",
                last ? "text-foreground font-bold" : "text-muted-foreground",
              )}
            >
              {formatCalendarDate(`${month}-01`, locale, { month: "short" })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
