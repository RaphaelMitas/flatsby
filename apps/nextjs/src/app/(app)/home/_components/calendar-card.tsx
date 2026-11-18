"use client";

import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Skeleton } from "@flatsby/ui/skeleton";
import {
  describeNextEvent,
  formatCalendarDate,
  weekDays,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import { HomeCard, PaceNumbers, useHomePace } from "./home-card";
import { useHomeCalendar } from "./use-home-calendar";

const DOTS = 3;

export function CalendarCard({
  groupId,
  today,
}: {
  groupId: number;
  today: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const pace = useHomePace(groupId, today);
  const calendar = useHomeCalendar(groupId, today);

  return (
    <HomeCard
      href="/calendar"
      title={t("navigation.calendar")}
      testId="home-card-calendar"
    >
      <PaceNumbers
        pace={pace?.choresDone}
        today={today}
        format={String}
        unit={(count) => t("home.choresDone", { count })}
      />
      {today ? (
        <div className="mt-4 grid grid-cols-7 text-center">
          {weekDays(today).map((date, index) => (
            <div key={date} className="flex flex-col items-center gap-1">
              <span className="text-muted-foreground text-xs font-medium">
                {formatCalendarDate(date, locale, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full font-semibold tabular-nums",
                  date === today && "bg-foreground text-background",
                )}
              >
                {Number(date.slice(8))}
              </span>
              <span className="flex h-1.5 gap-0.5">
                {calendar?.days[index]?.entries
                  .slice(0, DOTS)
                  .map(({ item, occurrence }) => (
                    <span
                      key={`${item.id}-${occurrence.date}`}
                      className={cn(
                        "size-1.5 rounded-full",
                        categoryFillColorMap[item.color],
                      )}
                    />
                  ))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Skeleton className="mt-4 h-16" />
      )}
      {calendar?.nextEvent && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              categoryFillColorMap[calendar.nextEvent.item.color],
            )}
          />
          <span className="line-clamp-1 font-semibold">
            {calendar.nextEvent.item.title}
          </span>
          <span className="text-muted-foreground ml-auto shrink-0">
            {describeNextEvent(calendar.nextEvent, t, locale)}
          </span>
        </div>
      )}
    </HomeCard>
  );
}
