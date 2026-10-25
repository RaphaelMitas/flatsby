import type { GroupWithAccess } from "@flatsby/api";
import type {
  CalendarColor,
  CalendarItemKind,
  CalendarItemView,
  RepeatForm,
  Weekday,
} from "@flatsby/validators/calendar";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  calendarColors,
  createCalendarItemSchema,
  daysBetween,
  defaultColorFor,
  defaultEndsOn,
  defaultEventTime,
  describeMonthDay,
  describeSeries,
  deviceTimeZone,
  earliestEndsOn,
  editedStartsOn,
  eventEndChoices,
  eventSpanOf,
  formatCalendarDate,
  formEndsOn,
  hasEnded,
  localDate,
  maxEvery,
  monthDayChoices,
  newRepeatFormFor,
  pickerDate,
  positionWindow,
  recurrenceOf,
  repeatFormOf,
  repeatUnits,
  revealDate,
  weekdayName,
  weekdayOf,
  weekdays,
  withPickedStart,
  withStart,
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
import { Chip, useCalendarPeople } from "./CalendarPeople";
import { calendarPosition } from "./calendarPosition";
import { calendarRangeOptions } from "./CalendarScreen";
import { useCalendarMutations } from "./useCalendarMutations";

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
  const [span, setSpan] = useState(() => eventSpanOf(item));
  const { time } = span;
  const [pickedRepeat, setRepeat] = useState<RepeatForm | null>(() =>
    item ? repeatFormOf(item.recurrence) : null,
  );
  const repeat = pickedRepeat ?? newRepeatFormFor(kind);
  const [pickedEnd, setPickedEnd] = useState(
    item?.recurrence ? item.endsOn : null,
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

  const recurrence = recurrenceOf(repeat, startsOn);
  const ends = eventEndChoices(startsOn, span);
  const ended = item ? hasEnded(item, today) : false;
  const endsOn = formEndsOn(item, recurrence, pickedEnd, startsOn, today);
  const input = {
    groupId: group.id,
    kind,
    title,
    color,
    startsOn,
    time: isTask ? null : time,
    recurrence,
    endsOn,
    days: isTask ? 1 : span.days,
    timeZone: deviceTimeZone(),
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
      // Leaving first rules out a second submit; the optimistic row needs the range it lands in cached
      router.dismissTo({
        pathname: "/(tabs)/calendar",
        params: { date: startsOn },
      });
      const now = localDate();
      await queryClient
        .query({
          ...calendarRangeOptions(
            group.id,
            positionWindow(revealDate(calendarPosition(), startsOn, now), now),
          ),
          staleTime: "static",
        })
        .catch(() => undefined);
      create.mutate(trimmed);
    }
  };

  const pickStart = (picked: string) => {
    setPickedStart(picked);
    if (pickedRepeat) setRepeat(withPickedStart(pickedRepeat, picked));
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
        {isTask ? (
          !ended && (
            <DatePickerField
              testID="calendar-form-starts-on"
              label={
                recurrence
                  ? t("calendar.form.startsOn")
                  : t("calendar.form.date")
              }
              value={pickerDate(startsOn)}
              maximumDate={endsOn ? pickerDate(endsOn) : undefined}
              onChange={(picked) => pickStart(localDate(picked))}
            />
          )
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <Label>{t("calendar.allDay")}</Label>
              <Switch
                testID="calendar-form-all-day"
                checked={time === null}
                onCheckedChange={(allDay) =>
                  setSpan({
                    ...span,
                    time: allDay ? null : defaultEventTime,
                  })
                }
              />
            </View>
            {(!ended || time) && (
              <View className="flex-row items-center gap-2">
                <Label className="w-16">{t("calendar.form.begins")}</Label>
                {!ended && (
                  <DatePickerField
                    testID="calendar-form-starts-on"
                    value={pickerDate(startsOn)}
                    maximumDate={endsOn ? pickerDate(endsOn) : undefined}
                    onChange={(picked) => pickStart(localDate(picked))}
                  />
                )}
                {time && (
                  <DatePickerField
                    testID="calendar-form-start-time"
                    mode="time"
                    value={pickerTime(time.start)}
                    onChange={(picked) =>
                      setSpan(
                        withStart(time, span.days, fromPickerTime(picked)),
                      )
                    }
                  />
                )}
              </View>
            )}
            {(!ended || time) && (
              <View className="flex-row items-center gap-2">
                <Label className="w-16">{t("calendar.form.ends")}</Label>
                {!ended && (
                  <DatePickerField
                    testID="calendar-form-event-ends-on"
                    value={pickerDate(ends.value)}
                    minimumDate={pickerDate(ends.min)}
                    maximumDate={pickerDate(ends.max)}
                    onChange={(picked) =>
                      setSpan({
                        ...span,
                        days: daysBetween(startsOn, localDate(picked)),
                      })
                    }
                  />
                )}
                {time && (
                  <DatePickerField
                    testID="calendar-form-end-time"
                    mode="time"
                    value={pickerTime(time.end)}
                    onChange={(picked) =>
                      setSpan({
                        ...span,
                        time: { ...time, end: fromPickerTime(picked) },
                      })
                    }
                  />
                )}
              </View>
            )}
          </>
        )}
      </View>

      {!ended && (
        <>
          <FieldLabel>{t("calendar.form.repeat")}</FieldLabel>
          <View className="flex-row flex-wrap gap-1.5">
            {repeatUnits.map((unit) => (
              <Chip
                key={unit}
                testID={`calendar-form-repeat-${unit}`}
                label={t(`calendar.repeatOption.${unit}`)}
                active={repeat.unit === unit}
                onPress={() => changeRepeat({ unit })}
              />
            ))}
          </View>

          {repeat.unit !== "never" && (
            <View className="mt-3 flex-row items-center gap-2">
              <Text className="text-foreground">
                {t("calendar.form.every")}
              </Text>
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
              <Text className="text-foreground">
                {t(`calendar.unit.${repeat.unit}`, { count: repeat.every })}
              </Text>
            </View>
          )}

          {repeat.unit === "weeks" && (
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

          {repeat.unit === "months" && (
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {monthDayChoices(repeat, startsOn).map(({ on, selected }) => {
                const by = "week" in on ? "weekday" : "day";
                return (
                  <Chip
                    key={by}
                    testID={`calendar-form-repeat-on-${by}`}
                    label={t("calendar.form.on", {
                      on: describeMonthDay(on, t, locale),
                    })}
                    active={selected}
                    onPress={() => changeRepeat({ monthDay: on })}
                  />
                );
              })}
            </View>
          )}

          {(repeat.unit === "months" || repeat.unit === "years") && (
            <Text className="text-muted-foreground mt-2 text-xs">
              {t("calendar.form.startDateHint")}
            </Text>
          )}
        </>
      )}

      {ended && endsOn && (
        <>
          <FieldLabel>{t("calendar.form.ended")}</FieldLabel>
          <View
            testID="calendar-form-ended"
            className="bg-muted h-12 justify-center rounded-lg px-3"
          >
            <Text className="text-foreground">
              {formatCalendarDate(endsOn, locale, { dateStyle: "long" })}
            </Text>
          </View>
          <Text className="text-muted-foreground mt-2 text-xs">
            {t("calendar.form.endedHint")}
          </Text>
        </>
      )}
      {recurrence && !ended && (
        <>
          <FieldLabel>{t("calendar.form.endRepeat")}</FieldLabel>
          <View className="flex-row flex-wrap gap-1.5">
            <Chip
              testID="calendar-form-ends-never"
              label={t("calendar.repeatOption.never")}
              active={endsOn === null}
              onPress={() => setPickedEnd(null)}
            />
            <Chip
              testID="calendar-form-ends-on-date"
              label={t("calendar.form.endsOnDate")}
              active={endsOn !== null}
              onPress={() =>
                setPickedEnd(pickedEnd ?? defaultEndsOn(startsOn, today))
              }
            />
          </View>
          {endsOn && (
            <View className="mt-3">
              <DatePickerField
                testID="calendar-form-ends-date"
                label={t("calendar.form.lastDay")}
                value={pickerDate(endsOn)}
                minimumDate={pickerDate(earliestEndsOn(startsOn, today))}
                onChange={(picked) => setPickedEnd(localDate(picked))}
              />
            </View>
          )}
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
          {describeSeries({ recurrence, endsOn }, today, t, locale, startsOn)}
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
