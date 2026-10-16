"use client";

import type { CalendarRange } from "@flatsby/validators/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import {
  entriesOn,
  formatCalendarDate,
  monthGrid,
  monthOf,
} from "@flatsby/validators/calendar";

const MAX_DOTS = 3;

interface MonthGridProps {
  month: string;
  selected: string;
  today: string;
  range: CalendarRange;
  onSelect: (date: string) => void;
  onShiftMonth: (delta: number) => void;
}

export function MonthGrid({
  month,
  selected,
  today,
  range,
  onSelect,
  onShiftMonth,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const { days } = monthGrid(month);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3
          className="text-lg font-semibold"
          data-testid="calendar-month-label"
        >
          {formatCalendarDate(`${month}-01`, locale, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="flex items-center gap-1">
          {selected !== today && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(today)}
              data-testid="calendar-today-button"
            >
              {t("today")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("previousMonth")}
            onClick={() => onShiftMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("nextMonth")}
            onClick={() => onShiftMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.slice(0, 7).map((day) => (
          <div
            key={day}
            className="text-muted-foreground py-1 text-center text-xs font-semibold uppercase"
          >
            {formatCalendarDate(day, locale, { weekday: "short" })}
          </div>
        ))}
        {days.map((day) => {
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={formatCalendarDate(day, locale, {
                dateStyle: "full",
              })}
              data-testid={`calendar-day-${day}`}
              className="hover:bg-muted/60 flex h-12 flex-col items-center gap-1 rounded-xl pt-1 transition-colors"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-sm tabular-nums",
                  monthOf(day) !== month && "text-muted-foreground/50",
                  day === today && "text-destructive font-bold",
                  isSelected && "bg-primary text-primary-foreground font-bold",
                )}
              >
                {Number(day.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {entriesOn(range, day)
                  .slice(0, MAX_DOTS)
                  .map(({ item, occurrence }) => (
                    <span
                      key={`${item.id}-${occurrence.originalDate}`}
                      className={cn(
                        "size-1.5 rounded-full",
                        item.kind === "event" ? "bg-info" : "bg-foreground",
                        occurrence.completedAt && "opacity-25",
                      )}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
