"use client";

import { useLocale } from "next-intl";

import { cn } from "@flatsby/ui";
import { formatCalendarDate } from "@flatsby/validators/calendar";
import { barHeights } from "@flatsby/validators/statistics";

const MIN_INNER_LABEL_HEIGHT = 20;

export function MonthBars({
  months,
  height,
  format,
}: {
  months: { month: string; total: number; share?: number }[];
  height: number;
  format: (value: number) => string;
}) {
  const locale = useLocale();
  const scaled = barHeights(
    [
      ...months.map(({ total }) => total),
      ...months.map(({ share }) => share ?? 0),
    ],
    height,
  );
  const totals = scaled.slice(0, months.length);
  const shares = scaled.slice(months.length);

  return (
    <div className="mt-4 flex items-end gap-3" aria-hidden>
      {months.map(({ month, total, share }, index) => {
        const last = index === months.length - 1;
        const shareHeight = shares[index] ?? 0;
        return (
          <div
            key={month}
            className={cn(
              "text-muted-foreground flex flex-1 flex-col items-center gap-1 text-xs font-medium tabular-nums",
              last && "text-foreground font-bold",
            )}
          >
            <span>{format(total)}</span>
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-lg",
                share !== undefined
                  ? "bg-muted-foreground/20"
                  : last
                    ? "bg-foreground"
                    : "bg-muted-foreground/40",
              )}
              style={{ height: totals[index] }}
            >
              {share !== undefined && (
                <div
                  className={cn(
                    "text-background absolute inset-x-0 bottom-0 flex justify-center pt-1 font-bold",
                    last ? "bg-foreground" : "bg-muted-foreground",
                  )}
                  style={{ height: shareHeight }}
                >
                  {shareHeight >= MIN_INNER_LABEL_HEIGHT && format(share)}
                </div>
              )}
            </div>
            <span className="mt-1">
              {formatCalendarDate(`${month}-01`, locale, { month: "short" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
