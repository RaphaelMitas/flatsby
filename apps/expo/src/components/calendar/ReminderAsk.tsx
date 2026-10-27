import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  eveningReminders,
  formatCalendarDate,
  listWindow,
} from "@flatsby/validators/calendar";

import { Button } from "~/lib/ui/button";
import { Card, CardContent } from "~/lib/ui/card";
import { firstEvening, useReminderSwitch } from "~/utils/evening-reminders";
import { calendarRangeOptions } from "./calendarRangeOptions";

export function ReminderAsk({
  groupId,
  meId,
  today,
}: {
  groupId: number;
  meId: number;
  today: string;
}) {
  const t = useTranslations("calendar.reminders");
  const locale = useLocale();
  const { enable, disable } = useReminderSwitch("calendar");
  const window = listWindow(today, today);
  const { data } = useQuery(calendarRangeOptions(groupId, window));
  const [turn] = data?.success
    ? eveningReminders(
        data.data,
        firstEvening(today, new Date()),
        window.to,
        meId,
      ).flatMap(({ turns }) => turns)
    : [];
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
