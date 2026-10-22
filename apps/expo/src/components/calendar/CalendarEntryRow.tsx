import type { CalendarEntry } from "@flatsby/validators/calendar";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  describeEventTime,
  describeOverdue,
  describeRecurrence,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { CalendarPeople } from "./CalendarPeople";
import { Checkbox } from "~/lib/ui/checkbox";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import { OccurrenceStatus } from "./CalendarPeople";

interface CalendarEntryRowProps {
  entry: CalendarEntry;
  people: CalendarPeople;
  today: string;
  missed?: string[];
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}

export function CalendarEntryRow({
  entry: { item, occurrence },
  people,
  today,
  missed = [],
  onToggle,
  onOpen,
}: CalendarEntryRowProps) {
  const t = useTranslations();
  const locale = useLocale();
  const done = occurrence.completedAt !== null;
  const pending = item.id < 0;
  const isTask = item.kind === "task";
  const overdue =
    isTask && !done && (occurrence.date < today || missed.length > 0);

  return (
    <View
      testID={`calendar-row-${item.title}`}
      className={cn("flex-row items-center", pending && "opacity-60")}
    >
      {isTask && (
        <Checkbox
          testID={`calendar-entry-checkbox-${item.title}`}
          accessibilityLabel={item.title}
          checked={done}
          disabled={pending}
          onCheckedChange={onToggle}
        />
      )}
      <Pressable
        testID={`calendar-entry-${item.title}`}
        accessible={e2eAccessibilityOverride()}
        accessibilityRole="button"
        disabled={pending}
        onPress={onOpen}
        className="active:bg-muted flex-1 flex-row items-center gap-1 self-stretch pr-3"
      >
        {!isTask && (
          <View className="items-center justify-center p-4">
            <View className="bg-muted h-6 w-6 items-center justify-center rounded-full">
              <Icon name="clock" size={14} color="muted-foreground" />
            </View>
          </View>
        )}
        <View
          className={cn(
            "mr-1.5 h-2.5 w-2.5 rounded-full",
            categoryFillColorMap[item.color],
            done && "opacity-25",
          )}
        />
        <View className="min-w-0 flex-1 py-3">
          <Text
            numberOfLines={1}
            className={cn(
              "text-foreground text-base font-medium",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </Text>
          <View className="flex-row items-center gap-1">
            {!isTask && (
              <Text className="text-muted-foreground text-sm">
                {describeEventTime(item.time, t)} ·
              </Text>
            )}
            {overdue && (
              <Text className="text-destructive text-sm">
                {describeOverdue(missed, t)} ·
              </Text>
            )}
            {item.recurrence && (
              <Icon name="repeat" size={12} color="muted-foreground" />
            )}
            <Text numberOfLines={1} className="text-muted-foreground text-sm">
              {describeRecurrence(item.recurrence, t, locale)}
            </Text>
          </View>
        </View>
        <OccurrenceStatus occurrence={occurrence} people={people} />
      </Pressable>
    </View>
  );
}
