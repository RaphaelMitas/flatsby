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
import { useSession } from "./auth/auth-client";
import { useShoppingStore } from "./shopping-store";
import { storedChoice } from "./stored-choice";
import { useNow } from "./useNow";

// Stored with the user id, so someone else signing in on this phone is asked again
const reminderChoice = storedChoice(
  "evening-reminders",
  (saved) => saved ?? "",
);

/** null until the stored choice and the session are read */
export function useReminderChoice() {
  const stored = reminderChoice.useValue();
  const userId = useSession().data?.user.id;
  if (stored === null || !userId) return null;
  if (stored === `on:${userId}`) return "on";
  return stored === `off:${userId}` ? "off" : "undecided";
}

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

interface Reminder {
  at: Date;
  request: NotificationRequestInput & { identifier: string };
}

// Scheduling an identifier again replaces it, so only stale ones are cancelled after
let queue = Promise.resolve();
const reschedule = (reminders: Reminder[], channel: string) => {
  queue = queue
    .then(async () => {
      const kept = new Set<string>();
      if (
        reminders.length > 0 &&
        (await Notifications.getPermissionsAsync()).granted
      ) {
        await ensureChannel(channel);
        const now = new Date();
        for (const { at, request } of reminders) {
          // Android may still deliver tonight's late; iOS throws on a time already past
          kept.add(request.identifier);
          if (at > now) await Notifications.scheduleNotificationAsync(request);
        }
      }
      for (const {
        identifier,
      } of await Notifications.getAllScheduledNotificationsAsync())
        if (!kept.has(identifier))
          await Notifications.cancelScheduledNotificationAsync(identifier);
    })
    .catch(console.error);
};

export function useReminderSwitch(source: "calendar" | "settings") {
  const posthog = usePostHog();
  const t = useTranslations("calendar.reminders");
  const userId = useSession().data?.user.id;

  const choose = (next: "on" | "off") => {
    posthog.capture("evening_reminders_changed", { to: next, source });
    if (userId) reminderChoice.save(`${next}:${userId}`);
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
  entries
    .map(({ item }) =>
      item.time ? `${item.time.start} ${item.title}` : item.title,
    )
    .join(", ");

export function useEveningReminders() {
  const t = useTranslations("calendar.reminders");
  const session = useSession();
  const signedIn = session.isPending ? undefined : Boolean(session.data?.user);
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
          : t("tomorrow", { titles: titles(events) });
      const body = [
        turns.length > 0 &&
          events.length > 0 &&
          t("also", { titles: titles(events) }),
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
        },
      } satisfies Reminder;
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

  const sync = useEffectEvent((target: string | null) => {
    // The next account on this phone shouldn't see the last one's chores
    if (signedIn === false)
      Notifications.dismissAllNotificationsAsync().catch(console.error);
    if (target !== null)
      reschedule(target === "off" ? [] : (reminders ?? []), t("channel"));
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: now runs it again on every return to the app, which picks up permission granted in the phone's settings
  useEffect(() => sync(target), [target, now]);

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
