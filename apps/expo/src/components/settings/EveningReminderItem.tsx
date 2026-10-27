import type { NotificationPermissionsStatus } from "expo-notifications";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useTranslations } from "use-intl";

import { Checkbox } from "~/lib/ui/checkbox";
import {
  useReminderChoice,
  useReminderSwitch,
} from "~/utils/evening-reminders";
import { SettingsItem } from "./SettingsItem";

export function EveningReminderItem() {
  const t = useTranslations("settings.items");
  const choice = useReminderChoice();
  const { enable, disable } = useReminderSwitch("settings");
  const [permission, setPermission] =
    useState<NotificationPermissionsStatus | null>(null);

  // Read again on return, since it can change in the phone's settings
  useEffect(() => {
    const read = () => {
      Notifications.getPermissionsAsync()
        .then(setPermission)
        .catch(console.error);
    };
    read();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => subscription.remove();
  }, []);

  const blocked = choice === "on" && permission?.granted === false;
  const checked = choice === "on" && permission?.granted === true;
  const toggle = () => {
    if (checked) disable();
    else enable().then(setPermission).catch(console.error);
  };

  return (
    <SettingsItem
      testID="settings-evening-reminder"
      title={t("eveningReminder")}
      subtitle={
        blocked ? t("eveningReminderBlocked") : t("eveningReminderSubtitle")
      }
      iconName={blocked ? "bell-off" : "bell"}
      onPress={toggle}
      rightContent={<Checkbox checked={checked} onCheckedChange={toggle} />}
    />
  );
}
