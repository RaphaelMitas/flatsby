import * as Notifications from "expo-notifications";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { Switch } from "~/lib/ui/switch";
import {
  useReminderChoice,
  useReminderSwitch,
} from "~/utils/evening-reminders";
import { SettingsItem } from "./SettingsItem";

const permissionOptions = queryOptions({
  queryKey: ["notification-permission"],
  queryFn: () => Notifications.getPermissionsAsync(),
  gcTime: 0,
  retry: false,
  refetchOnReconnect: false,
});

export function EveningReminderItem() {
  const t = useTranslations("settings.items");
  const choice = useReminderChoice();
  const { enable, disable } = useReminderSwitch("settings");
  const queryClient = useQueryClient();
  const { data: permission } = useQuery(permissionOptions);

  const blocked =
    permission?.granted === false &&
    (choice === "on" || !permission.canAskAgain);
  const checked = choice === "on" && permission?.granted === true;
  const toggle = () => {
    if (checked) disable();
    else
      enable()
        .then((next) =>
          queryClient.setQueryData(permissionOptions.queryKey, next),
        )
        .catch(console.error);
  };

  return (
    <SettingsItem
      testID="settings-evening-reminder"
      title={t("eveningReminder")}
      subtitle={blocked ? t("eveningReminderBlocked") : undefined}
      iconName={blocked ? "bell-off" : "bell"}
      onPress={toggle}
      rightContent={<Switch checked={checked} onCheckedChange={toggle} />}
    />
  );
}
