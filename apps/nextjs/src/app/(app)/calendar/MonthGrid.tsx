"use client";

import type { AgendaDay, CalendarEntry } from "@flatsby/validators/calendar";
import { useLayoutEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { cn } from "@flatsby/ui";
import {
  formatCalendarDate,
  monthGrid,
  monthOf,
  timesMissed,
} from "@flatsby/validators/calendar";
import {
  categoryBgColorMap,
  categoryFillColorMap,
  categoryTextColorMap,
} from "@flatsby/validators/expenses/category-colors";

const WEEKS = 6;
const DATE_HEIGHT = 28;
const LINE_HEIGHT = 20;

interface MonthGridProps {
  month: string;
  /** Undefined while loading */
  days: AgendaDay[] | undefined;
  today: string;
  onSelect: (date: string) => void;
  onOpen: (entry: CalendarEntry) => void;
}

export function MonthGrid({
  month,
  days,
  today,
  onSelect,
  onOpen,
}: MonthGridProps) {
  const locale = useLocale();
  const dates = monthGrid(month).weeks.flat();
  const grid = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const lines = Math.max(
    1,
    Math.floor((height / WEEKS - DATE_HEIGHT) / LINE_HEIGHT),
  );

  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t">
      <div className="grid grid-cols-7 border-b">
        {dates.slice(0, 7).map((date) => (
          <div
            key={date}
            className="text-muted-foreground py-1 text-center text-xs font-semibold uppercase"
          >
            {formatCalendarDate(date, locale, { weekday: "short" })}
          </div>
        ))}
      </div>
      <div
        ref={grid}
        className="grid min-h-80 flex-1 grid-cols-7 grid-rows-6"
        data-testid="calendar-month"
      >
        {dates.map((date, index) => {
          const entries = days?.[index]?.entries ?? [];
          const shown =
            entries.length > lines ? entries.slice(0, lines - 1) : entries;
          return (
            <div
              key={date}
              className={cn(
                "flex min-w-0 flex-col gap-0.5 overflow-hidden border-b px-1",
                index % 7 !== 6 && "border-r",
                monthOf(date) !== month && "bg-muted/30",
              )}
              data-testid={`calendar-day-${date}`}
            >
              <button
                type="button"
                onClick={() => onSelect(date)}
                aria-label={formatCalendarDate(date, locale, {
                  dateStyle: "full",
                })}
                className="hover:bg-muted/60 flex shrink-0 items-center rounded"
                style={{ height: DATE_HEIGHT }}
              >
                <span
                  className={cn(
                    "grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums",
                    date === today && "bg-primary text-primary-foreground",
                    date !== today &&
                      monthOf(date) !== month &&
                      "text-muted-foreground",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
              </button>
              {shown.map((entry) => {
                const { item, occurrence } = entry;
                const done = occurrence.completedAt !== null;
                return (
                  <button
                    key={`${item.id}-${occurrence.date}`}
                    type="button"
                    disabled={item.id < 0}
                    onClick={() => onOpen(entry)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 truncate rounded px-1 text-left text-xs hover:brightness-95",
                      item.kind === "event" && [
                        "font-medium",
                        categoryBgColorMap[item.color],
                        categoryTextColorMap[item.color].default,
                      ],
                      item.kind === "task" &&
                        (done
                          ? "text-muted-foreground line-through"
                          : timesMissed(entry, today) > 0 &&
                            "text-destructive"),
                    )}
                    style={{ height: LINE_HEIGHT - 2 }}
                    data-testid="calendar-month-entry"
                  >
                    {item.kind === "task" && (
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          categoryFillColorMap[item.color],
                          done && "opacity-25",
                        )}
                      />
                    )}
                    <span className="truncate">
                      {item.time && `${item.time.start} `}
                      {item.title}
                    </span>
                  </button>
                );
              })}
              {shown.length < entries.length && (
                <button
                  type="button"
                  onClick={() => onSelect(date)}
                  className="text-muted-foreground hover:text-foreground shrink-0 px-1 text-left text-xs"
                >
                  +{entries.length - shown.length}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
