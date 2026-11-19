import type {
  Statistics,
  StatisticsRange,
} from "@flatsby/validators/statistics";
import type { CSSTransitionProperties } from "react-native-reanimated";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useLocale } from "use-intl";

import { formatCalendarDate } from "@flatsby/validators/calendar";
import { barHeights, coversMonth } from "@flatsby/validators/statistics";

import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";

const LABEL_ROW = 20;
const INSIDE_LABEL_MIN_HEIGHT = 22;
const growing: CSSTransitionProperties = {
  transitionProperty: "height",
  transitionDuration: 300,
  transitionTimingFunction: "ease-out",
};

export interface MonthPicker {
  range: StatisticsRange;
  period: Pick<Statistics, "from" | "to">;
  onPick: (month: string) => void;
}

interface MonthBar {
  month: string;
  total: number;
  filled?: number;
}

export function MonthBars({
  bars,
  height,
  format,
  picker,
  tint,
  barTestID,
}: {
  bars: MonthBar[] | undefined;
  height: number;
  format: (value: number) => string;
  picker: MonthPicker | undefined;
  tint?: string;
  barTestID: string;
}) {
  const locale = useLocale();

  if (!bars || !picker)
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
        const picked = coversMonth(month, picker.range, picker.period);
        const barHeight = heights[index] ?? 0;
        const filledHeight =
          filled === undefined || total === 0
            ? barHeight
            : (barHeight * filled) / total;
        const label = cn(
          "text-xs font-medium",
          picked ? "text-foreground font-bold" : "text-muted-foreground",
        );
        return (
          <Pressable
            key={month}
            testID={`${barTestID}-${month}`}
            accessibilityRole="button"
            accessibilityState={{ selected: picked }}
            accessibilityLabel={`${formatCalendarDate(`${month}-01`, locale, { month: "long" })}: ${format(total)}`}
            onPress={() => picker.onPick(month)}
            className="flex-1 items-center active:opacity-70"
          >
            <View
              className="items-center justify-end"
              style={{ height: height + LABEL_ROW }}
            >
              <Text className={cn("mb-1", label)}>{format(total)}</Text>
              <Animated.View
                className="bg-border w-9 justify-end overflow-hidden rounded-sm"
                style={{ height: barHeight, ...growing }}
              >
                <Animated.View
                  className={cn(
                    "items-center pt-1",
                    tint
                      ? cn(tint, !picked && "opacity-40")
                      : picked
                        ? "bg-foreground"
                        : filled === undefined
                          ? "bg-muted-foreground/40"
                          : "bg-muted-foreground",
                  )}
                  style={{ height: filledHeight, ...growing }}
                >
                  {filled !== undefined &&
                    filledHeight >= INSIDE_LABEL_MIN_HEIGHT && (
                      <Text className="text-background text-xs font-bold">
                        {format(filled)}
                      </Text>
                    )}
                </Animated.View>
              </Animated.View>
            </View>
            <Text className={cn("mt-1", label)}>
              {formatCalendarDate(`${month}-01`, locale, { month: "short" })}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
