"use client";

import type {
  CalendarEntry,
  CalendarRange,
} from "@flatsby/validators/calendar";
import { Clock, Plus, Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import { Checkbox } from "@flatsby/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import {
  daySummary,
  describeEventTime,
  describeRecurrence,
  entriesOn,
  formatCalendarDate,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { MemberLookup } from "./CalendarPeople";
import { DoneBy, TurnPill } from "./CalendarPeople";

interface DayListProps {
  date: string;
  today: string;
  range: CalendarRange;
  meId: number;
  members: MemberLookup;
  mine: boolean;
  onMineChange: (mine: boolean) => void;
  onToggle: (entry: CalendarEntry, done: boolean) => void;
  onOpen: (entry: CalendarEntry) => void;
  onAdd: () => void;
}

export function DayList({
  date,
  today,
  range,
  meId,
  members,
  mine,
  onMineChange,
  onToggle,
  onOpen,
  onAdd,
}: DayListProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const summary = daySummary(entriesOn(range, date), meId);
  const entries = entriesOn(range, date, mine ? meId : undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-bold" data-testid="calendar-day-heading">
            {date === today
              ? t("today")
              : formatCalendarDate(date, locale, { weekday: "long" })}
            <span className="text-muted-foreground ml-2 text-base font-medium">
              {formatCalendarDate(date, locale, {
                day: "numeric",
                month: "long",
              })}
            </span>
          </h3>
          {summary.total > 0 && (
            <p
              className="text-muted-foreground text-sm"
              data-testid="calendar-day-progress"
            >
              {t("dayProgress", summary)}
              {summary.onYou > 0 &&
                ` · ${t("onYou", { count: summary.onYou })}`}
            </p>
          )}
        </div>
        <Tabs
          value={mine ? "mine" : "all"}
          onValueChange={(value) => onMineChange(value === "mine")}
        >
          <TabsList>
            <TabsTrigger value="all" data-testid="calendar-filter-all">
              {t("all")}
            </TabsTrigger>
            <TabsTrigger value="mine" data-testid="calendar-filter-mine">
              {t("mine")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {entries.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {entries.map((entry) => (
            <EntryRow
              key={`${entry.item.id}-${entry.occurrence.date}`}
              entry={entry}
              today={today}
              meId={meId}
              members={members}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
        </ul>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center text-sm">
          {mine ? t("nothingOnYou") : t("nothingPlanned")}
          {!mine && (
            <Button
              variant="outline"
              onClick={onAdd}
              data-testid="calendar-empty-add"
            >
              <Plus />
              {t("addSomething")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  today,
  meId,
  members,
  onToggle,
  onOpen,
}: {
  entry: CalendarEntry;
  today: string;
  meId: number;
  members: MemberLookup;
  onToggle: (entry: CalendarEntry, done: boolean) => void;
  onOpen: (entry: CalendarEntry) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { item, occurrence } = entry;
  const done = occurrence.completedAt !== null;
  const pending = item.id < 0;
  const isTask = item.kind === "task";
  const overdue = isTask && !done && occurrence.date < today;

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        pending && "opacity-60",
      )}
      data-testid={`calendar-entry-${item.id}`}
    >
      {isTask ? (
        <Checkbox
          checked={done}
          disabled={pending}
          onCheckedChange={(checked) => onToggle(entry, checked === true)}
          aria-label={item.title}
          data-testid="calendar-entry-toggle"
          className="h-5 w-5 cursor-pointer rounded-md"
        />
      ) : (
        <span className="bg-muted text-muted-foreground grid size-6 shrink-0 place-items-center rounded-md">
          <Clock className="size-4" />
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => onOpen(entry)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        data-testid="calendar-entry-open"
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            categoryFillColorMap[item.color],
            done && "opacity-25",
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium transition-colors",
              done && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </p>
          <p className="text-muted-foreground flex items-center gap-1 truncate text-sm">
            {!isTask && <span>{describeEventTime(item.time, t)} ·</span>}
            {overdue && (
              <span className="text-destructive">
                {t("calendar.overdue")} ·
              </span>
            )}
            {item.recurrence && <Repeat className="size-3 shrink-0" />}
            <span className="truncate">
              {describeRecurrence(item.recurrence, t, locale)}
            </span>
          </p>
        </div>
        {done ? (
          <DoneBy completedBy={occurrence.completedBy} />
        ) : (
          occurrence.turnGroupMemberId !== null && (
            <TurnPill
              memberId={occurrence.turnGroupMemberId}
              meId={meId}
              members={members}
            />
          )
        )}
      </button>
    </li>
  );
}
