import type { CalendarEntry } from "@flatsby/validators/calendar";
import { Pressable, Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { describeRecurrence } from "@flatsby/validators/calendar";

import type { CalendarPeople } from "./CalendarPeople";
import { Checkbox } from "~/lib/ui/checkbox";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { e2eAccessibilityOverride } from "~/utils/e2e";
import { OccurrenceStatus } from "./CalendarPeople";

interface CalendarEntryRowProps {
  entry: CalendarEntry;
  people: CalendarPeople;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}

export function CalendarEntryRow({
  entry: { item, occurrence },
  people,
  onToggle,
  onOpen,
}: CalendarEntryRowProps) {
  const t = useTranslations();
  const locale = useLocale();
  const done = occurrence.completedAt !== null;
  const pending = item.id < 0;
  const when =
    item.kind === "event" ? (item.time ?? t("calendar.allDay")) : null;

  return (
    <Pressable
      testID={`calendar-entry-${item.title}`}
      accessible={e2eAccessibilityOverride()}
      disabled={pending}
      onPress={onOpen}
      className={cn(
        "active:bg-muted flex-row items-center gap-1 pr-3",
        pending && "opacity-60",
      )}
    >
      {item.kind === "task" ? (
        <Checkbox
          testID={`calendar-entry-checkbox-${item.title}`}
          checked={done}
          disabled={pending}
          onCheckedChange={onToggle}
        />
      ) : (
        <View className="items-center justify-center p-4">
          <View className="bg-info/15 h-6 w-6 items-center justify-center rounded-full">
            <Icon name="clock" size={14} color="info" />
          </View>
        </View>
      )}
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
          {when && (
            <Text className="text-muted-foreground text-sm">{when} ·</Text>
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
  );
}
