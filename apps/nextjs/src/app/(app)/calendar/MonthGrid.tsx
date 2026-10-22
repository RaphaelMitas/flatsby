"use client";

import type { CalendarRange } from "@flatsby/validators/calendar";
import type { ReactNode, Ref } from "react";
import { useLayoutEffect, useRef } from "react";
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
  addDays,
  entriesOn,
  formatCalendarDate,
  monthGrid,
  monthOf,
  weekDays,
  weekStart,
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
  rangeOf: (date: string) => CalendarRange | undefined;
  collapsed: boolean;
  /** Fully closed: the swipeable week strip replaces the grid's week. */
  closed: boolean;
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
  rangeOf,
  collapsed,
  closed,
  onSelect,
  onStep,
  onToggleCollapsed,
  children,
}: MonthGridProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const month = monthOf(selected);
  const { days, weeks } = monthGrid(month);
  const selectedWeek = weeks.findIndex((week) => week.includes(selected));

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
                <WeekRow
                  key={week[0]}
                  days={week}
                  month={month}
                  selected={selected}
                  today={today}
                  rangeOf={rangeOf}
                  onSelect={onSelect}
                  // Closed, the strip on top carries this week
                  inert={collapsed && (closed || index !== selectedWeek)}
                />
              ))}
            </div>
          </div>
          <WeekStrip
            key={weekStart(selected)}
            selected={selected}
            today={today}
            month={month}
            rangeOf={rangeOf}
            closed={closed}
            onSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}

interface WeekRowProps {
  days: string[];
  month: string;
  selected: string;
  today: string;
  rangeOf: (date: string) => CalendarRange | undefined;
  onSelect: (date: string) => void;
  inert?: boolean;
  /** The strip repeats the grid's days, so only the grid carries their test ids. */
  testIds?: boolean;
}

function WeekRow({
  days,
  month,
  selected,
  today,
  rangeOf,
  onSelect,
  inert,
  testIds = true,
}: WeekRowProps) {
  const locale = useLocale();
  return (
    <div
      className="grid w-full shrink-0 snap-start grid-cols-7"
      style={{ height: WEEK_HEIGHT }}
      inert={inert}
    >
      {days.map((day) => {
        const isSelected = day === selected;
        const range = rangeOf(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={isSelected}
            aria-label={formatCalendarDate(day, locale, { dateStyle: "full" })}
            data-testid={testIds ? `calendar-day-${day}` : undefined}
            className="hover:bg-muted/60 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors"
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
              {(range ? entriesOn(range, day) : [])
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
  );
}

/** Lies over the closed month's week. */
function WeekStrip({
  closed,
  ...row
}: Omit<WeekRowProps, "days" | "inert" | "testIds"> & { closed: boolean }) {
  const { selected, onSelect } = row;
  const scroller = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = weekStart(selected);

  // Remounted per week with the selected week in the middle; centring it before paint hides the swap after a swipe
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.clientWidth;
  }, []);

  const land = () => {
    const element = scroller.current;
    if (!element) return;
    const page = Math.round(element.scrollLeft / element.clientWidth);
    // Mid-drag positions aren't a choice; only a snapped page is
    if (Math.abs(element.scrollLeft - page * element.clientWidth) > 1) return;
    if (page !== 1) onSelect(addDays(selected, 7 * (page - 1)));
  };

  return (
    <div
      ref={scroller}
      onScroll={() => {
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(land, 100);
      }}
      className={cn(
        "bg-background absolute inset-x-4 flex snap-x snap-mandatory overflow-x-auto",
        !closed && "pointer-events-none opacity-0",
      )}
      style={{ top: WEEK_PADDING, scrollbarWidth: "none" }}
      inert={!closed}
    >
      {[-1, 0, 1].map((delta) => {
        const days = weekDays(addDays(start, 7 * delta));
        return (
          <WeekRow
            key={days[0]}
            days={days}
            testIds={false}
            // Tabbing to a neighbour week would scroll it in and swipe the selection
            inert={delta !== 0}
            {...row}
          />
        );
      })}
    </div>
  );
}
