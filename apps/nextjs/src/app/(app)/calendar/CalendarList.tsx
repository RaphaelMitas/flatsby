"use client";

import type {
  AgendaDay,
  AgendaEntry,
  DueChore,
} from "@flatsby/validators/calendar";
import { useRef } from "react";
import { Clock, Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Checkbox } from "@flatsby/ui/checkbox";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  describeEventTime,
  describeRecurrence,
  formatCalendarDate,
  timesMissed,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { MemberLookup } from "./CalendarPeople";
import { DoneBy, TurnPill } from "./CalendarPeople";

const MAX_DOTS = 4;

interface CalendarListProps {
  /** Undefined while loading */
  agenda: { days: AgendaDay[]; overdue: DueChore[] } | undefined;
  dates: string[];
  today: string;
  meId: number;
  members: MemberLookup;
  member: number | null;
  onToggle: (entry: AgendaEntry, done: boolean) => void;
  onOpen: (entry: AgendaEntry) => void;
}

export function CalendarList({
  agenda,
  dates,
  today,
  meId,
  members,
  member,
  onToggle,
  onOpen,
}: CalendarListProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const scroller = useRef<HTMLDivElement>(null);

  const rows = (entries: AgendaEntry[]) => (
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
  );

  return (
    <>
      <div className="grid grid-cols-7 border-b px-2 pb-2">
        {dates.map((date, index) => {
          const entries = agenda?.days[index]?.entries ?? [];
          return (
            <button
              key={date}
              type="button"
              onClick={() =>
                // The first day goes to the very top, so the overdue chores above it show too
                date === dates[0]
                  ? scroller.current?.scrollTo({ top: 0, behavior: "smooth" })
                  : scroller.current
                      ?.querySelector(`[data-date="${date}"]`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              aria-label={formatCalendarDate(date, locale, {
                dateStyle: "full",
              })}
              className="hover:bg-muted/60 flex flex-col items-center gap-0.5 rounded-xl py-1 transition-colors"
              data-testid={`calendar-day-${date}`}
            >
              <span className="text-muted-foreground text-xs font-semibold uppercase">
                {formatCalendarDate(date, locale, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-sm font-semibold tabular-nums",
                  date === today && "bg-primary text-primary-foreground",
                )}
              >
                {Number(date.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {entries.slice(0, MAX_DOTS).map(({ item, occurrence }) => (
                  <span
                    key={`${item.id}-${occurrence.date}`}
                    className={cn(
                      "size-1.5 rounded-full",
                      categoryFillColorMap[item.color],
                      occurrence.completedAt && "opacity-25",
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-24"
        data-testid="calendar-agenda"
      >
        {!agenda ? (
          <div className="flex flex-col gap-4 py-4">
            {dates.map((date) => (
              <Skeleton key={date} className="h-5 w-40 rounded" />
            ))}
          </div>
        ) : (
          <>
            {agenda.overdue.length > 0 && (
              <section data-testid="calendar-overdue">
                <h3 className="text-destructive pt-4 pb-2 text-lg font-bold">
                  {t("overdue")}
                </h3>
                {rows(agenda.overdue)}
              </section>
            )}
            {agenda.days.map(({ date, entries, summary }) => (
              <section
                key={date}
                data-date={date}
                data-testid={`calendar-agenda-${date === today ? "today" : date}`}
                className="scroll-mt-2"
              >
                <div
                  className={cn(
                    "flex items-baseline gap-2",
                    entries.length > 0 ? "pt-4 pb-2" : "py-2",
                  )}
                >
                  <h3
                    className={cn(
                      "font-semibold",
                      entries.length > 0 ? "text-lg" : "opacity-60",
                    )}
                    data-testid="calendar-day-heading"
                  >
                    {date === today
                      ? t("today")
                      : formatCalendarDate(date, locale, { weekday: "long" })}
                  </h3>
                  <span className="text-muted-foreground text-sm font-medium">
                    {formatCalendarDate(date, locale, {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  {entries.length === 0 && (
                    <span className="text-muted-foreground text-sm">
                      {member === meId
                        ? t("nothingOnYou")
                        : t("nothingPlanned")}
                    </span>
                  )}
                  {entries.length > 0 && summary.total > 0 && (
                    <span
                      className="text-muted-foreground ml-auto text-sm"
                      data-testid="calendar-day-progress"
                    >
                      {t("dayProgress", summary)}
                      {summary.onYou > 0 &&
                        ` · ${t("onYou", { count: summary.onYou })}`}
                    </span>
                  )}
                </div>
                {entries.length > 0 && rows(entries)}
              </section>
            ))}
          </>
        )}
      </div>
    </>
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
  entry: AgendaEntry;
  today: string;
  meId: number;
  members: MemberLookup;
  onToggle: (entry: AgendaEntry, done: boolean) => void;
  onOpen: (entry: AgendaEntry) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { item, occurrence } = entry;
  const done = occurrence.completedAt !== null;
  const pending = item.id < 0;
  const isTask = item.kind === "task";
  const missed = timesMissed(entry, today);

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
            {!isTask && (
              <span>
                {describeEventTime(item, t, locale, occurrence.date)} ·
              </span>
            )}
            {missed > 0 && (
              <span className="text-destructive">
                {t("calendar.missed", { count: missed })} ·
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
