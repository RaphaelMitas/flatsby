import type { CalendarRange } from "@flatsby/validators/calendar";
import { Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  eveningReminders,
  formatCalendarDate,
  listWindow,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { useReminderSwitch } from "~/utils/evening-reminders";

/** Asked once, when the next week holds a turn of mine */
export function ReminderAsk({
  range,
  today,
  meId,
}: {
  range: CalendarRange;
  today: string;
  meId: number;
}) {
  const t = useTranslations("calendar.reminders");
  const locale = useLocale();
  const { enable, disable } = useReminderSwitch("calendar");
  const [turn] = eveningReminders(
    range,
    today,
    listWindow(today, today).to,
    meId,
  ).flatMap(({ turns }) => turns);
  if (!turn) return null;

  return (
    <View
      testID="calendar-reminder-ask"
      className="border-border bg-card mx-4 mb-2 rounded-lg border p-3"
    >
      <Text className="text-foreground text-base font-semibold">
        {t("askTitle")}
      </Text>
      <Text className="text-muted-foreground mt-0.5 text-sm">
        {t("askBody", {
          title: turn.item.title,
          day: formatCalendarDate(turn.occurrence.date, locale, {
            weekday: "long",
          }),
        })}
      </Text>
      <View className="mt-3 flex-row gap-2">
        <Button size="sm" title={t("turnOn")} onPress={() => void enable()} />
        <Button
          size="sm"
          variant="ghost"
          title={t("notNow")}
          onPress={disable}
        />
      </View>
    </View>
  );
}
