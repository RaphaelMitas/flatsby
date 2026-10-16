"use client";

import type { GroupMemberWithUserInfo } from "@flatsby/api";
import type {
  CalendarItemKind,
  CalendarItemView,
  CreateCalendarItemInput,
  RepeatForm,
  Weekday,
} from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import { useState } from "react";
import { CalendarIcon, Clock, Repeat, SquareCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Input } from "@flatsby/ui/input";
import { Label } from "@flatsby/ui/label";
import { Switch } from "@flatsby/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import { UserAvatar } from "@flatsby/ui/user-avatar";
import {
  describeRecurrence,
  formatCalendarDate,
  newRepeatForm,
  recurrenceOf,
  repeatChoices,
  repeatFormOf,
  repeatShowsDays,
  weekdayName,
  weekdayOf,
  weekdays,
} from "@flatsby/validators/calendar";

import { DatePopover } from "./DatePopover";

const DEFAULT_TIME = "19:00";
const MAX_INTERVAL = 365;

interface CalendarItemFormProps {
  groupId: number;
  members: GroupMemberWithUserInfo[];
  item?: CalendarItemView;
  defaultDate: string;
  onCancel: () => void;
  onSubmit: (input: CreateCalendarItemInput) => void;
}

export function CalendarItemForm({
  groupId,
  members,
  item,
  defaultDate,
  onCancel,
  onSubmit,
}: CalendarItemFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [kind, setKind] = useState<CalendarItemKind>(item?.kind ?? "task");
  const [title, setTitle] = useState(item?.title ?? "");
  const [startsOn, setStartsOn] = useState(item?.startsOn ?? defaultDate);
  const [time, setTime] = useState(item?.time ?? null);
  const [repeat, setRepeat] = useState<RepeatForm>(() =>
    item ? repeatFormOf(item.recurrence) : newRepeatForm,
  );
  const [memberIds, setMemberIds] = useState(item?.memberIds ?? []);

  const isTask = kind === "task";
  const recurrence = recurrenceOf(repeat, startsOn, kind);
  const weekDays = repeat.days ?? [weekdayOf(startsOn)];
  const canSave = title.trim().length > 0;

  const changeKind = (next: CalendarItemKind) => {
    setKind(next);
    if (next === "event" && repeat.choice === "afterDone")
      setRepeat({ ...repeat, choice: "never" });
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
    if (!canSave) return;
    onSubmit({
      groupId,
      kind,
      title: title.trim(),
      startsOn,
      time: isTask ? null : time,
      recurrence,
      memberIds: isTask ? memberIds : [],
    });
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
        maxLength={256}
        autoFocus={!item}
        className="h-11 text-lg font-semibold"
        data-testid="calendar-form-title"
      />

      <Tabs
        value={kind}
        onValueChange={(value) =>
          changeKind(value === "event" ? "event" : "task")
        }
      >
        <TabsList className="w-full">
          <TabsTrigger value="task" data-testid="calendar-form-kind-task">
            <SquareCheck />
            {t("calendar.kind.task")}
          </TabsTrigger>
          <TabsTrigger value="event" data-testid="calendar-form-kind-event">
            <Clock />
            {t("calendar.kind.event")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="divide-y rounded-xl border">
        <FormRow
          label={
            recurrence ? t("calendar.form.startsOn") : t("calendar.form.date")
          }
        >
          <DatePopover value={startsOn} onSelect={setStartsOn}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="calendar-form-date"
            >
              <CalendarIcon />
              {formatCalendarDate(startsOn, locale, { dateStyle: "medium" })}
            </Button>
          </DatePopover>
        </FormRow>
        {!isTask && (
          <FormRow label={t("calendar.form.allDay")} htmlFor="calendar-all-day">
            <Switch
              id="calendar-all-day"
              checked={time === null}
              onCheckedChange={(allDay) =>
                setTime(allDay ? null : DEFAULT_TIME)
              }
            />
          </FormRow>
        )}
        {!isTask && time !== null && (
          <FormRow label={t("calendar.form.time")} htmlFor="calendar-time">
            <Input
              id="calendar-time"
              type="time"
              value={time}
              onChange={(event) =>
                event.target.value && setTime(event.target.value)
              }
              className="w-auto"
              data-testid="calendar-form-time"
            />
          </FormRow>
        )}
      </div>

      <Field label={t("calendar.form.repeat")}>
        <div className="flex flex-wrap gap-1.5">
          {repeatChoices
            .filter((choice) => isTask || choice !== "afterDone")
            .map((choice) => (
              <Chip
                key={choice}
                selected={repeat.choice === choice}
                onClick={() => setRepeat({ ...repeat, choice })}
                testId={`calendar-repeat-${choice}`}
              >
                {t(`calendar.repeatOption.${choice}`)}
              </Chip>
            ))}
        </div>
        {(repeat.choice === "custom" || repeat.choice === "afterDone") && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            {t("calendar.form.every")}
            <Input
              type="number"
              min={1}
              max={MAX_INTERVAL}
              value={repeat.every}
              onChange={(event) =>
                setRepeat({
                  ...repeat,
                  every: Math.min(
                    MAX_INTERVAL,
                    Math.max(1, Math.round(Number(event.target.value)) || 1),
                  ),
                })
              }
              className="w-20"
              data-testid="calendar-form-interval"
            />
            {repeat.choice === "afterDone" ? (
              t("calendar.unit.days", { count: repeat.every })
            ) : (
              <div className="flex gap-1.5">
                {(["days", "weeks"] as const).map((unit) => (
                  <Chip
                    key={unit}
                    selected={repeat.unit === unit}
                    onClick={() => setRepeat({ ...repeat, unit })}
                  >
                    {t(`calendar.unit.${unit}`, { count: repeat.every })}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}
        {repeatShowsDays(repeat) && (
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
      </Field>

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
        {`${describeRecurrence(recurrence, t, locale)} · ${formatCalendarDate(startsOn, locale, { weekday: "short", day: "numeric", month: "short" })}`}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FormRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2">
      <Label htmlFor={htmlFor} className="font-normal">
        {label}
      </Label>
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
