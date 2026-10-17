import type { GroupWithAccess } from "@flatsby/api";
import type {
  CalendarColor,
  CalendarItemKind,
  CalendarItemView,
  RepeatForm,
  Weekday,
} from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  calendarColors,
  createCalendarItemSchema,
  defaultColorFor,
  describeRecurrence,
  editedStartsOn,
  formatCalendarDate,
  localDate,
  maxEvery,
  monthOf,
  newRepeatForm,
  pickerDate,
  recurrenceOf,
  repeatChoices,
  repeatFormOf,
  repeatShowsDays,
  weekdayName,
  weekdayOf,
  weekdays,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { DatePickerField } from "~/lib/ui/date-picker-field";
import { Input } from "~/lib/ui/input";
import { Label } from "~/lib/ui/label";
import { Segmented } from "~/lib/ui/segmented";
import { Switch } from "~/lib/ui/switch";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { MemberAvatar } from "../expenses/MemberAvatar";
import { fromPickerTime, pickerTime } from "./calendarDates";
import { useCalendarPeople } from "./CalendarPeople";
import { calendarRangeOptions } from "./CalendarScreen";
import { useCalendarMutations } from "./useCalendarMutations";

const DEFAULT_TIME = "19:00";

function Chip({
  label,
  active,
  onPress,
  testID,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  children?: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-2 rounded-full border px-3 py-1.5",
        active ? "border-primary bg-primary" : "border-border",
      )}
    >
      {children}
      <Text
        className={cn(
          "text-sm font-medium",
          active ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Label className="mt-6 mb-2">{children}</Label>;
}

interface CalendarItemFormProps {
  group: GroupWithAccess;
  itemId: number | undefined;
  date: string | undefined;
}

export function CalendarItemForm({
  group,
  itemId,
  date,
}: CalendarItemFormProps) {
  const today = localDate();
  const { data } = useQuery(
    trpc.calendar.item.queryOptions(
      { groupId: group.id, id: itemId ?? -1, today },
      { enabled: itemId !== undefined },
    ),
  );

  if (itemId === undefined) {
    return <ItemFields group={group} defaultStart={date ?? today} />;
  }
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!data.success) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-destructive text-center">
          {data.error.message}
        </Text>
      </View>
    );
  }
  return (
    <ItemFields
      group={group}
      item={data.data.item}
      defaultStart={data.data.item.startsOn}
    />
  );
}

function ItemFields({
  group,
  item,
  defaultStart,
}: {
  group: GroupWithAccess;
  item?: CalendarItemView;
  defaultStart: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const people = useCalendarPeople(group);
  const { create, update } = useCalendarMutations(group);

  const [title, setTitle] = useState(item?.title ?? "");
  const [kind, setKind] = useState<CalendarItemKind>(item?.kind ?? "task");
  const [pickedColor, setPickedColor] = useState<CalendarColor | null>(
    item?.color ?? null,
  );
  const [pickedStart, setPickedStart] = useState<string | null>(null);
  const [time, setTime] = useState(item?.time ?? null);
  const [repeat, setRepeat] = useState(() =>
    item ? repeatFormOf(item.recurrence) : newRepeatForm,
  );
  const [memberIds, setMemberIds] = useState(item?.memberIds ?? []);

  const today = localDate();
  const startsOn = item
    ? editedStartsOn(item, repeat, pickedStart, today)
    : (pickedStart ?? defaultStart);
  const days = repeat.days ?? [weekdayOf(startsOn)];
  const isTask = kind === "task";
  const color = pickedColor ?? defaultColorFor(kind);
  const changeRepeat = (change: Partial<RepeatForm>) => {
    const next = { ...repeat, ...change };
    setRepeat({ ...next, every: Math.min(next.every, maxEvery(next)) });
  };

  const input = {
    groupId: group.id,
    kind,
    title,
    color,
    startsOn,
    time: isTask ? null : time,
    recurrence: recurrenceOf(repeat, startsOn),
    memberIds: isTask ? memberIds : [],
  };
  const valid = createCalendarItemSchema.safeParse(input).success;

  const save = async () => {
    if (!valid) return;
    const trimmed = { ...input, title: title.trim() };
    if (item) {
      update.mutate({ ...trimmed, id: item.id, today });
      router.dismissTo("/(tabs)/calendar");
    } else {
      // Leaving first rules out a second submit; the optimistic row needs its month cached
      router.dismissTo({
        pathname: "/(tabs)/calendar",
        params: { date: startsOn },
      });
      await queryClient
        .query({
          ...calendarRangeOptions(group.id, monthOf(startsOn)),
          staleTime: "static",
        })
        .catch(() => undefined);
      create.mutate(trimmed);
    }
  };

  const toggleDay = (day: Weekday) => {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : weekdays.filter((d) => d === day || days.includes(d));
    if (next.length > 0) changeRepeat({ days: next });
  };

  const toggleMember = (memberId: number) =>
    setMemberIds(
      memberIds.includes(memberId)
        ? memberIds.filter((id) => id !== memberId)
        : [...memberIds, memberId],
    );

  return (
    <AppScrollView contentContainerClassName="p-5 pb-12">
      <Stack.Screen
        options={{
          title: item
            ? t("calendar.form.editTitle")
            : t("calendar.form.newTitle"),
        }}
      />
      <Input
        testID="calendar-form-title"
        placeholder={t("calendar.form.titlePlaceholder")}
        value={title}
        onChangeText={setTitle}
        autoFocus={!item}
        maxLength={256}
        returnKeyType="done"
      />

      {!item && (
        <View className="mt-4">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              {
                value: "task",
                label: t("calendar.kind.task"),
                icon: "circle-check-big",
                testID: "calendar-form-kind-task",
              },
              {
                value: "event",
                label: t("calendar.kind.event"),
                icon: "clock",
                testID: "calendar-form-kind-event",
              },
            ]}
          />
        </View>
      )}

      <FieldLabel>{t("calendar.form.color")}</FieldLabel>
      <View className="flex-row flex-wrap gap-3">
        {calendarColors.map((option) => (
          <Pressable
            key={option}
            testID={`calendar-form-color-${option}`}
            accessibilityRole="button"
            accessibilityLabel={t(`calendar.color.${option}`)}
            accessibilityState={{ selected: color === option }}
            onPress={() => setPickedColor(option)}
            className={cn(
              "h-8 w-8 items-center justify-center rounded-full",
              categoryFillColorMap[option],
            )}
          >
            {color === option && (
              <Icon name="check" size={16} color="background" />
            )}
          </Pressable>
        ))}
      </View>

      <View className="mt-6 gap-4">
        <DatePickerField
          testID="calendar-form-starts-on"
          label={
            input.recurrence
              ? t("calendar.form.startsOn")
              : t("calendar.form.date")
          }
          value={pickerDate(startsOn)}
          maximumDate={item?.endsOn ? pickerDate(item.endsOn) : undefined}
          onChange={(picked) => setPickedStart(localDate(picked))}
        />
        {!isTask && (
          <>
            <View className="flex-row items-center justify-between">
              <Label>{t("calendar.allDay")}</Label>
              <Switch
                testID="calendar-form-all-day"
                checked={time === null}
                onCheckedChange={(allDay) =>
                  setTime(allDay ? null : DEFAULT_TIME)
                }
              />
            </View>
            {time !== null && (
              <DatePickerField
                testID="calendar-form-time"
                mode="time"
                label={t("calendar.form.time")}
                value={pickerTime(time)}
                onChange={(picked) => setTime(fromPickerTime(picked))}
              />
            )}
          </>
        )}
      </View>

      <FieldLabel>{t("calendar.form.repeat")}</FieldLabel>
      <View className="flex-row flex-wrap gap-1.5">
        {repeatChoices.map((choice) => (
          <Chip
            key={choice}
            testID={`calendar-form-repeat-${choice}`}
            label={t(`calendar.repeatOption.${choice}`)}
            active={repeat.choice === choice}
            onPress={() => changeRepeat({ choice })}
          />
        ))}
      </View>

      {repeat.choice === "custom" && (
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <Text className="text-foreground">{t("calendar.form.every")}</Text>
          <Button
            variant="outline"
            size="sm"
            icon="minus"
            accessibilityLabel={t("calendar.form.decreaseInterval")}
            disabled={repeat.every <= 1}
            onPress={() => changeRepeat({ every: repeat.every - 1 })}
          />
          <Text className="text-foreground min-w-8 text-center text-lg font-bold">
            {repeat.every}
          </Text>
          <Button
            variant="outline"
            size="sm"
            icon="plus"
            accessibilityLabel={t("calendar.form.increaseInterval")}
            disabled={repeat.every >= maxEvery(repeat)}
            onPress={() => changeRepeat({ every: repeat.every + 1 })}
          />
          <Segmented
            size="sm"
            value={repeat.unit}
            onChange={(unit) => changeRepeat({ unit })}
            options={[
              {
                value: "days",
                label: t("calendar.unit.days", { count: repeat.every }),
              },
              {
                value: "weeks",
                label: t("calendar.unit.weeks", { count: repeat.every }),
              },
            ]}
          />
        </View>
      )}

      {repeatShowsDays(repeat) && (
        <>
          <FieldLabel>{t("calendar.form.days")}</FieldLabel>
          <View className="flex-row flex-wrap gap-1.5">
            {weekdays.map((day) => (
              <Chip
                key={day}
                testID={`calendar-form-day-${day}`}
                label={weekdayName(day, locale, "short")}
                active={days.includes(day)}
                onPress={() => toggleDay(day)}
              />
            ))}
          </View>
        </>
      )}

      {isTask && (
        <>
          <FieldLabel>{t("calendar.form.who")}</FieldLabel>
          <View className="flex-row flex-wrap gap-2">
            {group.groupMembers.map((member) => {
              const position = memberIds.indexOf(member.id);
              return (
                <View key={member.id}>
                  <Chip
                    testID={`calendar-form-member-${member.id}`}
                    label={member.user.name}
                    active={position !== -1}
                    onPress={() => toggleMember(member.id)}
                  >
                    <MemberAvatar
                      person={people.person(member.id)}
                      className="-ml-2 h-6 w-6"
                      textClassName="text-xs"
                    />
                  </Chip>
                  {position !== -1 && memberIds.length > 1 && (
                    <View className="bg-info absolute -top-1.5 -left-1 h-4 w-4 items-center justify-center rounded-full">
                      <Text className="text-info-foreground text-xs font-bold">
                        {position + 1}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Text className="text-muted-foreground mt-2 text-xs">
            {t("calendar.form.whoHint")}
          </Text>
        </>
      )}

      <View className="bg-muted mt-6 flex-row items-center gap-2.5 rounded-lg p-3.5">
        <Icon name="repeat" size={16} color="foreground" />
        <Text
          testID="calendar-form-summary"
          className="text-foreground flex-1 text-sm"
        >
          {`${describeRecurrence(input.recurrence, t, locale)} · ${formatCalendarDate(startsOn, locale, { weekday: "short", day: "numeric", month: "short" })}`}
        </Text>
      </View>

      <Button
        testID="calendar-form-save"
        className="mt-4"
        size="lg"
        disabled={!valid}
        title={item ? t("calendar.form.save") : t("calendar.form.create")}
        onPress={() => void save()}
      />
    </AppScrollView>
  );
}
