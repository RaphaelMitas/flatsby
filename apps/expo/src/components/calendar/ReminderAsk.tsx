import type { CalendarRange } from "@flatsby/validators/calendar";
import { Text, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import {
  eveningReminders,
  formatCalendarDate,
  listWindow,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
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
    <Card testID="calendar-reminder-ask" className="mx-4 mb-2">
      <CardContent className="gap-3 p-4">
        <View className="gap-0.5">
          <Text className="text-foreground text-base font-semibold">
            {t("askTitle")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("askBody", {
              title: turn.item.title,
              day: formatCalendarDate(turn.occurrence.date, locale, {
                weekday: "long",
              }),
            })}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Button size="sm" title={t("turnOn")} onPress={() => void enable()} />
          <Button
            size="sm"
            variant="ghost"
            title={t("notNow")}
            onPress={disable}
          />
        </View>
      </CardContent>
    </Card>
  );
}
