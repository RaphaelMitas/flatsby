"use client";

import type {
  CalendarEntry,
  CalendarRange,
} from "@flatsby/validators/calendar";
import type { Ref, RefObject } from "react";
import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { Clock, Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Checkbox } from "@flatsby/ui/checkbox";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  agendaDays,
  describeEventTime,
  describeRecurrence,
  formatCalendarDate,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { MemberLookup } from "./CalendarPeople";
import { DoneBy, TurnPill } from "./CalendarPeople";
import { MONTH_COVER } from "./MonthGrid";

interface AgendaMonth {
  month: string;
  range: CalendarRange | undefined;
}

export interface AgendaHandle {
  /** Scrolls by the rest of the way, so the month opens or closes with the list instead of over it. */
  toggleMonth: () => void;
}

interface AgendaProps {
  ref: Ref<AgendaHandle>;
  months: AgendaMonth[];
  /** A new object scrolls the agenda to its date, even the same date again. */
  jump: { date: string };
  today: string;
  meId: number;
  members: MemberLookup;
  mine: boolean;
  /** 0 is the open month, MONTH_COVER the single week; the agenda's scrolling drives it. */
  collapse: RefObject<number>;
  onCollapse: (collapse: number) => void;
  onScrolledTo: (date: string) => void;
  onReachEdge: (month: string) => void;
  onToggle: (entry: CalendarEntry, done: boolean) => void;
  onOpen: (entry: CalendarEntry) => void;
}

export function Agenda({
  ref,
  months,
  jump,
  today,
  meId,
  members,
  mine,
  collapse,
  onCollapse,
  onScrolledTo,
  onReachEdge,
  onToggle,
  onOpen,
}: AgendaProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  // The day at the top and how far it has scrolled past, held in place while months load or rows change above it
  const anchor = useRef({ date: jump.date, offset: -MONTH_COVER });
  // The layout can shift between our write and its scroll event, so that event can't be read as the person scrolling
  const written = useRef<number | null>(null);
  const lastTop = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const restore = useCallback(() => {
    const element = scroller.current;
    const day = element?.querySelector<HTMLElement>(
      `[data-date="${anchor.current.date}"]`,
    );
    if (!element || !day) return;
    const target = day.offsetTop + anchor.current.offset;
    // Writing scrollTop mid-fling stops the fling, so only when it moved
    if (Math.abs(element.scrollTop - target) < 1) return;
    element.scrollTop = target;
    written.current = element.scrollTop;
    // A wheel step can land in the same scroll event as this write, and the jump mustn't count as scrolling
    lastTop.current = element.scrollTop;
  }, []);

  useLayoutEffect(() => {
    anchor.current = {
      date: jump.date,
      offset: -(MONTH_COVER - collapse.current),
    };
    restore();
  }, [jump, restore, collapse]);

  useLayoutEffect(() => {
    if (!scroller.current || !content.current) return;
    const observer = new ResizeObserver(restore);
    observer.observe(scroller.current);
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [restore]);

  const scrollBy = (distance: number) =>
    scroller.current?.scrollBy({ top: distance, behavior: "smooth" });

  useImperativeHandle(ref, () => ({
    toggleMonth: () =>
      scrollBy(
        collapse.current > MONTH_COVER / 2
          ? -collapse.current
          : MONTH_COVER - collapse.current,
      ),
  }));

  const settle = () => {
    const rest = collapse.current;
    if (rest <= 0 || rest >= MONTH_COVER) return;
    scrollBy(rest > MONTH_COVER / 2 ? MONTH_COVER - rest : -rest);
  };

  const onScroll = () => {
    const element = scroller.current;
    if (!element) return;
    const first = months[0]?.month;
    const last = months.at(-1)?.month;
    const room = 3 * element.clientHeight;
    if (first && element.scrollTop < room) onReachEdge(first);
    if (last && element.scrollHeight - element.scrollTop < room)
      onReachEdge(last);

    const step = element.scrollTop - lastTop.current;
    lastTop.current = element.scrollTop;
    if (written.current === element.scrollTop) return;
    written.current = null;
    onCollapse(Math.min(MONTH_COVER, Math.max(0, collapse.current + step)));
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, 150);

    const visibleTop = element.scrollTop + MONTH_COVER - collapse.current;
    let top: HTMLElement | undefined;
    for (const day of element.querySelectorAll<HTMLElement>("[data-date]")) {
      if (top && day.offsetTop > visibleTop + 1) break;
      top = day;
    }
    const date = top?.dataset.date;
    if (!top || !date) return;
    anchor.current = { date, offset: element.scrollTop - top.offsetTop };
    onScrolledTo(date);
  };

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      className="relative min-h-0 flex-1 overflow-y-auto"
      // The anchor above does this, and the browser's own anchoring would fight it
      style={{ overflowAnchor: "none" }}
      data-testid="calendar-agenda"
    >
      <div ref={content}>
        {months.map(({ month, range }) =>
          agendaDays(range, month, meId, mine).map(
            ({ date, entries, summary }) => (
              <section
                key={date}
                data-date={date}
                data-testid={`calendar-agenda-${date === today ? "today" : date}`}
                className="pb-3"
              >
                <div
                  className="bg-background sticky z-10 px-4 py-2"
                  style={{
                    top: `calc(${MONTH_COVER}px - var(--month-collapse, 0px))`,
                  }}
                >
                  <h3
                    className="font-semibold"
                    data-testid="calendar-day-heading"
                  >
                    {date === today
                      ? t("today")
                      : formatCalendarDate(date, locale, { weekday: "long" })}
                    <span className="text-muted-foreground ml-2 text-sm font-medium">
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
                <div className="px-4">
                  {!range ? (
                    <Skeleton className="h-12 rounded-xl" />
                  ) : entries.length > 0 ? (
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
                    <p className="text-muted-foreground text-sm">
                      {mine ? t("nothingOnYou") : t("nothingPlanned")}
                    </p>
                  )}
                </div>
              </section>
            ),
          ),
        )}
      </div>
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
