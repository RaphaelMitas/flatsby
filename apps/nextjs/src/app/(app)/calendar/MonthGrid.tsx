"use client";

import type { CalendarRange } from "@flatsby/validators/calendar";
import type { ReactNode, Ref } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import {
  entriesOn,
  formatCalendarDate,
  monthGrid,
  monthOf,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

const MAX_DOTS = 3;
const WEEK_HEIGHT = 48;
const WEEK_PADDING = 6;
const WEEKS = 6;

/** How far the open month reaches over the agenda; scrolling that far closes it. */
export const MONTH_COVER = (WEEKS - 1) * WEEK_HEIGHT;

interface MonthGridProps {
  /** Carries --month-collapse, which the agenda's scrolling sets and the month's size follows. */
  ref: Ref<HTMLDivElement>;
  selected: string;
  today: string;
  range: CalendarRange;
  collapsed: boolean;
  onSelect: (date: string) => void;
  onStep: (delta: number) => void;
  onToggleCollapsed: () => void;
  /** Starts one week below the header; the open month lies on top of it, so collapsing never moves it. */
  children: ReactNode;
}

export function MonthGrid({
  ref,
  selected,
  today,
  range,
  collapsed,
  onSelect,
  onStep,
  onToggleCollapsed,
  children,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const month = monthOf(selected);
  const { days } = monthGrid(month);
  const weeks = Array.from({ length: WEEKS }, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
  const selectedWeek = Math.floor(days.indexOf(selected) / 7);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 px-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? t("showMonth") : t("showWeek")}
            aria-expanded={!collapsed}
            className="-ml-3 text-lg font-semibold"
            data-testid="calendar-grid-toggle"
          >
            <span data-testid="calendar-month-label">
              {formatCalendarDate(`${month}-01`, locale, {
                month: "long",
                year: "numeric",
              })}
            </span>
            {collapsed ? (
              <ChevronDown className="text-muted-foreground" />
            ) : (
              <ChevronUp className="text-muted-foreground" />
            )}
          </Button>
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
              aria-label={collapsed ? t("previousWeek") : t("previousMonth")}
              onClick={() => onStep(-1)}
              data-testid="calendar-previous-month"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={collapsed ? t("nextWeek") : t("nextMonth")}
              onClick={() => onStep(1)}
              data-testid="calendar-next-month"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7">
          {days.slice(0, 7).map((day) => (
            <div
              key={day}
              className="text-muted-foreground py-1 text-center text-xs font-semibold uppercase"
            >
              {formatCalendarDate(day, locale, { weekday: "short" })}
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ paddingTop: WEEK_HEIGHT + 2 * WEEK_PADDING }}
        >
          {children}
        </div>
        <div
          className="bg-background absolute inset-x-0 top-0 z-20 border-b px-4"
          style={{ paddingBlock: WEEK_PADDING }}
        >
          <div
            className="overflow-hidden"
            style={{
              height: `calc(${WEEK_HEIGHT * WEEKS}px - var(--month-collapse, 0px))`,
            }}
          >
            <div
              style={{
                transform: `translateY(calc(var(--month-collapse, 0px) * ${(-WEEK_HEIGHT * selectedWeek) / MONTH_COVER}))`,
              }}
            >
              {weeks.map((week, index) => (
                <div
                  key={week[0]}
                  className="grid grid-cols-7"
                  style={{ height: WEEK_HEIGHT }}
                  inert={collapsed && index !== selectedWeek}
                >
                  {week.map((day) => {
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
                        className="hover:bg-muted/60 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors"
                      >
                        <span
                          className={cn(
                            "grid size-8 place-items-center rounded-full text-sm tabular-nums",
                            monthOf(day) !== month &&
                              "text-muted-foreground/50",
                            day === today && "text-destructive font-bold",
                            isSelected &&
                              "bg-primary text-primary-foreground font-bold",
                          )}
                        >
                          {Number(day.slice(8))}
                        </span>
                        <span className="flex h-1.5 gap-0.5">
                          {entriesOn(range, day)
                            .slice(0, MAX_DOTS)
                            .map(({ item, occurrence }) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
