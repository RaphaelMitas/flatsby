"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type {
  CalendarColor,
  CalendarItemKind,
  CalendarItemView,
  CreateCalendarItemInput,
  EventTime,
  RepeatForm,
  Weekday,
} from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import { useState } from "react";
import { CircleCheckBig, Clock, Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  calendarColors,
  createCalendarItemSchema,
  defaultColorFor,
  defaultEndsOn,
  defaultEventTime,
  describeMonthDay,
  describeSeries,
  earliestEndsOn,
  editedStartsOn,
  formatCalendarDate,
  formEndsOn,
  hasEnded,
  maxEvery,
  monthDayChoices,
  newRepeatFormFor,
  recurrenceOf,
  repeatFormOf,
  repeatUnits,
  weekdayName,
  weekdayOf,
  weekdays,
  withPickedStart,
  withStart,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { DatePopover } from "./DatePopover";

interface CalendarItemFormProps {
  groupId: number;
  members: GroupMemberWithUserInfo[];
  item?: CalendarItemView;
  defaultDate: string;
  today: string;
  onCancel: () => void;
  onSubmit: (input: CreateCalendarItemInput) => void;
}

export function CalendarItemForm({
  groupId,
  members,
  item,
  defaultDate,
  today,
  onCancel,
  onSubmit,
}: CalendarItemFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [kind, setKind] = useState<CalendarItemKind>(item?.kind ?? "task");
  const [title, setTitle] = useState(item?.title ?? "");
  const [pickedColor, setPickedColor] = useState<CalendarColor | null>(
    item?.color ?? null,
  );
  const [pickedStart, setPickedStart] = useState<string | null>(null);
  const [time, setTime] = useState<EventTime | null>(item?.time ?? null);
  const [pickedRepeat, setRepeat] = useState<RepeatForm | null>(() =>
    item ? repeatFormOf(item.recurrence) : null,
  );
  const repeat = pickedRepeat ?? newRepeatFormFor(kind);
  const [pickedEnd, setPickedEnd] = useState(
    item?.recurrence ? item.endsOn : null,
  );
  const [memberIds, setMemberIds] = useState(item?.memberIds ?? []);
  // Typing "10" passes through an empty field, which the number itself can't hold
  const [everyText, setEveryText] = useState(String(repeat.every));

  const isTask = kind === "task";
  const color = pickedColor ?? defaultColorFor(kind);
  const startsOn = item
    ? editedStartsOn(item, repeat, pickedStart, today)
    : (pickedStart ?? defaultDate);
  const recurrence = recurrenceOf(repeat, startsOn);
  const ended = item ? hasEnded(item, today) : false;
  const endsOn = formEndsOn(item, recurrence, pickedEnd, startsOn, today);
  const weekDays = repeat.days ?? [weekdayOf(startsOn)];
  const input = {
    groupId,
    kind,
    title: title.trim(),
    color,
    startsOn,
    time: isTask ? null : time,
    recurrence,
    endsOn,
    memberIds: isTask ? memberIds : [],
  };
  const canSave = createCalendarItemSchema.safeParse(input).success;

  const changeRepeat = (change: Partial<RepeatForm>) => {
    const next = { ...repeat, ...change };
    const every = Math.min(next.every, maxEvery(next));
    setRepeat({ ...next, every });
    setEveryText(String(every));
  };

  const pickStart = (date: string) => {
    setPickedStart(date);
    if (pickedRepeat) setRepeat(withPickedStart(pickedRepeat, date));
  };

  const toggleDay = (day: Weekday) => {
    const days = weekDays.includes(day)
      ? weekDays.filter((d) => d !== day)
      : weekdays.filter((d) => d === day || weekDays.includes(d));
    if (days.length > 0) setRepeat({ ...repeat, days });
  };

  const toggleMember = (id: number) =>
    setMemberIds((ids) =>
      ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id],
    );

  const submit = () => {
    if (canSave) onSubmit(input);
  };

  return (
    <form
      className="flex flex-col gap-5"
      data-testid="calendar-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2 className="text-lg font-semibold">
        {item ? t("calendar.form.editTitle") : t("calendar.form.newTitle")}
      </h2>

      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t("calendar.form.titlePlaceholder")}
        aria-label={t("calendar.form.titlePlaceholder")}
        maxLength={256}
        autoFocus={!item}
        className="h-11 text-lg font-semibold"
        data-testid="calendar-form-title"
      />

      {!item && (
        <Tabs
          value={kind}
          onValueChange={(value) =>
            setKind(value === "event" ? "event" : "task")
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="task" data-testid="calendar-form-kind-task">
              <CircleCheckBig />
              {t("calendar.kind.task")}
            </TabsTrigger>
            <TabsTrigger value="event" data-testid="calendar-form-kind-event">
              <Clock />
              {t("calendar.kind.event")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Field label={t("calendar.form.color")}>
        <div className="flex flex-wrap gap-2">
          {calendarColors.map((option) => (
            <button
              key={option}
              type="button"
              aria-label={t(`calendar.color.${option}`)}
              aria-pressed={color === option}
              onClick={() => setPickedColor(option)}
              className={cn(
                "size-7 rounded-full",
                categoryFillColorMap[option],
                color === option &&
                  "ring-ring ring-offset-background ring-2 ring-offset-2",
              )}
              data-testid={`calendar-form-color-${option}`}
            />
          ))}
        </div>
      </Field>

      {!ended && (
        <Field
          label={
            recurrence ? t("calendar.form.startsOn") : t("calendar.form.date")
          }
        >
          <DatePopover
            value={startsOn}
            max={endsOn}
            onSelect={pickStart}
            testId="calendar-form-date"
          />
        </Field>
      )}
      {!isTask && (
        <div className="flex items-center justify-between">
          <Label htmlFor="calendar-all-day">{t("calendar.allDay")}</Label>
          <Switch
            id="calendar-all-day"
            checked={time === null}
            onCheckedChange={(allDay) =>
              setTime(allDay ? null : defaultEventTime)
            }
          />
        </div>
      )}
      {!isTask && time !== null && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("calendar.form.from")} htmlFor="calendar-start">
            <Input
              id="calendar-start"
              type="time"
              value={time.start}
              onChange={(event) =>
                event.target.value &&
                setTime(withStart(time, event.target.value))
              }
              data-testid="calendar-form-start-time"
            />
          </Field>
          <Field label={t("calendar.form.to")} htmlFor="calendar-end">
            <Input
              id="calendar-end"
              type="time"
              value={time.end}
              onChange={(event) =>
                event.target.value &&
                setTime({ ...time, end: event.target.value })
              }
              data-testid="calendar-form-end-time"
            />
          </Field>
        </div>
      )}

      {!ended && (
        <Field label={t("calendar.form.repeat")}>
          <div className="flex flex-wrap gap-1.5">
            {repeatUnits.map((unit) => (
              <Chip
                key={unit}
                selected={repeat.unit === unit}
                onClick={() => changeRepeat({ unit })}
                testId={`calendar-repeat-${unit}`}
              >
                {t(`calendar.repeatOption.${unit}`)}
              </Chip>
            ))}
          </div>
          {repeat.unit !== "never" && (
            <div className="flex items-center gap-2 pt-1 text-sm">
              {t("calendar.form.every")}
              <Input
                type="number"
                required
                min={1}
                max={maxEvery(repeat)}
                value={everyText}
                onChange={(event) => {
                  setEveryText(event.target.value);
                  const every = Math.round(Number(event.target.value));
                  if (every >= 1)
                    setRepeat({
                      ...repeat,
                      every: Math.min(every, maxEvery(repeat)),
                    });
                }}
                onBlur={() => setEveryText(String(repeat.every))}
                aria-label={t("calendar.form.every")}
                className="w-20"
                data-testid="calendar-form-interval"
              />
              {t(`calendar.unit.${repeat.unit}`, { count: repeat.every })}
            </div>
          )}
          {repeat.unit === "weeks" && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-sm">
              <span className="mr-1">{t("calendar.form.days")}</span>
              {weekdays.map((day) => (
                <Chip
                  key={day}
                  selected={weekDays.includes(day)}
                  onClick={() => toggleDay(day)}
                >
                  {weekdayName(day, locale, "short")}
                </Chip>
              ))}
            </div>
          )}
          {repeat.unit === "months" && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {monthDayChoices(repeat, startsOn).map(({ on, selected }) => {
                const by = "week" in on ? "weekday" : "day";
                return (
                  <Chip
                    key={by}
                    selected={selected}
                    onClick={() => changeRepeat({ monthDay: on })}
                    testId={`calendar-repeat-on-${by}`}
                  >
                    {t("calendar.form.on", {
                      on: describeMonthDay(on, t, locale),
                    })}
                  </Chip>
                );
              })}
            </div>
          )}
          {(repeat.unit === "months" || repeat.unit === "years") && (
            <p className="text-muted-foreground text-xs">
              {t("calendar.form.startDateHint")}
            </p>
          )}
        </Field>
      )}

      {ended && endsOn && (
        <Field label={t("calendar.form.ended")}>
          <p
            className="bg-muted rounded-md px-3 py-2 text-sm"
            data-testid="calendar-form-ended"
          >
            {formatCalendarDate(endsOn, locale, { dateStyle: "long" })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("calendar.form.endedHint")}
          </p>
        </Field>
      )}
      {recurrence && !ended && (
        <Field label={t("calendar.form.ends")}>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              selected={endsOn === null}
              onClick={() => setPickedEnd(null)}
              testId="calendar-form-ends-never"
            >
              {t("calendar.repeatOption.never")}
            </Chip>
            <Chip
              selected={endsOn !== null}
              onClick={() =>
                setPickedEnd(pickedEnd ?? defaultEndsOn(startsOn, today))
              }
              testId="calendar-form-ends-on-date"
            >
              {t("calendar.form.endsOnDate")}
            </Chip>
          </div>
          {endsOn && (
            <DatePopover
              value={endsOn}
              min={earliestEndsOn(startsOn, today)}
              onSelect={setPickedEnd}
              testId="calendar-form-ends-date"
            />
          )}
        </Field>
      )}

      {isTask && (
        <Field label={t("calendar.form.who")}>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => {
              const position = memberIds.indexOf(member.id);
              return (
                <Chip
                  key={member.id}
                  selected={position >= 0}
                  onClick={() => toggleMember(member.id)}
                  testId={`calendar-form-member-${member.id}`}
                >
                  <UserAvatar
                    name={member.user.name}
                    image={member.user.image}
                    size="xs"
                  />
                  {member.user.name}
                  {position >= 0 && memberIds.length > 1 && (
                    <span className="bg-info text-info-foreground grid size-4 place-items-center rounded-full text-xs">
                      {position + 1}
                    </span>
                  )}
                </Chip>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("calendar.form.whoHint")}
          </p>
        </Field>
      )}

      <p
        className="bg-muted flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm"
        data-testid="calendar-form-summary"
      >
        <Repeat className="size-4 shrink-0" />
        {describeSeries({ recurrence, endsOn }, today, t, locale, startsOn)}
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!canSave}
          data-testid="calendar-form-submit"
        >
          {item ? t("calendar.form.save") : t("calendar.form.create")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  testId,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? "default" : "outline"}
      aria-pressed={selected}
      onClick={onClick}
      className="rounded-full"
      data-testid={testId}
    >
      {children}
    </Button>
  );
}
