import type { CalendarEntry } from "@flatsby/validators/calendar";
import type { NotificationRequestInput } from "expo-notifications";
import { useEffect, useEffectEvent } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { usePostHog } from "posthog-react-native";
import { useTranslations } from "use-intl";
import { z } from "zod/v4";

import {
  addDays,
  calendarDateSchema,
  eveningReminders,
  listWindow,
  localDate,
  pickerDate,
} from "@flatsby/validators/calendar";

import { calendarRangeOptions } from "~/components/calendar/calendarRangeOptions";
import { trpc } from "./api";
import { useShoppingStore } from "./shopping-store";
import { storedChoice } from "./stored-choice";
import { useNow } from "./useNow";

const reminderChoice = storedChoice("evening-reminders", (saved) =>
  saved === "on" || saved === "off" ? saved : "undecided",
);

/** null until the stored choice is read */
export const useReminderChoice = reminderChoice.useValue;

const REMINDER_HOUR = 19;
const CHANNEL_ID = "evening-reminders";

const tapSchema = z.object({ groupId: z.number(), date: calendarDateSchema });

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

// Android 13 only shows the permission prompt once a channel exists
const ensureChannel = (name: string) =>
  Platform.OS === "android"
    ? Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name,
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    : Promise.resolve(null);

// Cancel-and-reschedule runs one at a time, so two quick changes can't interleave
let queue = Promise.resolve();
const reschedule = (requests: NotificationRequestInput[], channel: string) => {
  queue = queue
    .then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (requests.length === 0) return;
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      await ensureChannel(channel);
      for (const request of requests)
        await Notifications.scheduleNotificationAsync(request);
    })
    .catch(console.error);
};

export function useReminderSwitch(source: "calendar" | "settings") {
  const posthog = usePostHog();
  const t = useTranslations("calendar.reminders");

  const choose = (next: "on" | "off") => {
    posthog.capture("evening_reminders_changed", { to: next, source });
    reminderChoice.save(next);
  };

  const enable = async () => {
    await ensureChannel(t("channel"));
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && !current.canAskAgain) {
      choose("on");
      await Linking.openSettings();
      return current;
    }
    const result = current.granted
      ? current
      : await Notifications.requestPermissionsAsync();
    choose(result.granted ? "on" : "off");
    return result;
  };

  return { enable, disable: () => choose("off") };
}

const titles = (entries: CalendarEntry[]) =>
  entries.map(({ item }) => item.title).join(", ");

const eventTitles = (entries: CalendarEntry[]) =>
  entries
    .map(({ item }) =>
      item.time ? `${item.time.start} ${item.title}` : item.title,
    )
    .join(", ");

/** Keeps the evening reminders of every group in step with the calendar; signedIn is undefined while the session loads */
export function useEveningReminders(signedIn: boolean | undefined) {
  const t = useTranslations("calendar.reminders");
  const router = useRouter();
  const { selectedGroupId, setSelectedGroup } = useShoppingStore();
  const choice = useReminderChoice();
  const now = useNow();
  const today = localDate(now);
  const window = listWindow(today, today);
  const wanted = signedIn === true && choice === "on";

  const { data: groupsData } = useQuery({
    ...trpc.group.getUserGroups.queryOptions(),
    enabled: signedIn === true,
  });
  const groups = groupsData?.success ? groupsData.data : undefined;
  const details = useQueries({
    queries: (groups ?? []).map(({ id }) => ({
      ...trpc.group.getGroup.queryOptions({ id }),
      enabled: wanted,
    })),
  });
  const ranges = useQueries({
    queries: (groups ?? []).map(({ id }) => ({
      ...calendarRangeOptions(id, window),
      enabled: wanted,
    })),
  });

  const perGroup = groups?.map((group, index) => {
    const detail = details[index]?.data;
    const range = ranges[index]?.data;
    if (!detail?.success || !range?.success) return undefined;
    return eveningReminders(
      range.data,
      today,
      window.to,
      detail.data.thisGroupMember.id,
    ).map(({ evening, turns, events, open }) => {
      const head =
        turns.length > 0
          ? t("turnsTomorrow", { titles: titles(turns) })
          : t("tomorrow", { titles: eventTitles(events) });
      const body = [
        turns.length > 0 &&
          events.length > 0 &&
          t("also", { titles: eventTitles(events) }),
        open.length > 0 && t("stillOpen", { titles: titles(open) }),
      ].filter(Boolean);
      const at = pickerDate(evening);
      at.setHours(REMINDER_HOUR);
      return {
        at,
        request: {
          identifier: `${group.id}-${evening}`,
          content: {
            title: groups.length > 1 ? `${head} · ${group.name}` : head,
            ...(body.length > 0 && { body: body.join("\n") }),
            data: { groupId: group.id, date: addDays(evening, 1) },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
            channelId: CHANNEL_ID,
          },
        } satisfies NotificationRequestInput,
      };
    });
  });
  const reminders =
    perGroup && !perGroup.includes(undefined)
      ? perGroup.flatMap((group) => group ?? [])
      : undefined;
  // Stays put while anything loads, so a cold start offline keeps what's scheduled
  const target =
    signedIn === false || choice === "off" || choice === "undecided"
      ? "off"
      : wanted && reminders
        ? JSON.stringify(reminders)
        : null;

  // Runs again on every return to the app, which also picks up permission granted in the phone's settings
  const sync = useEffectEvent((target: string | null, now: Date) => {
    if (target === null) return;
    reschedule(
      target === "off"
        ? []
        : (reminders ?? [])
            .filter(({ at }) => at > now)
            .map(({ request }) => request),
      t("channel"),
    );
  });
  useEffect(() => sync(target, now), [target, now]);

  const response = Notifications.useLastNotificationResponse();
  const openTapped = useEffectEvent((data: unknown, loaded: typeof groups) => {
    const tapped = tapSchema.safeParse(data);
    const group = loaded?.find(({ id }) => id === tapped.data?.groupId);
    if (!tapped.success || !group) return;
    Notifications.clearLastNotificationResponse();
    if (group.id !== selectedGroupId) setSelectedGroup(group.id, group.name);
    router.navigate({
      pathname: "/(tabs)/calendar",
      params: { date: tapped.data.date },
    });
  });
  useEffect(() => {
    if (response)
      openTapped(response.notification.request.content.data, groups);
  }, [response, groups]);
}
