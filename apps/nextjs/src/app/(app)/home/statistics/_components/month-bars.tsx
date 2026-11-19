"use client";

import type {
  Statistics,
  StatisticsRange,
} from "@flatsby/validators/statistics";
import { useLocale } from "next-intl";

import { cn } from "@flatsby/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@flatsby/ui/tooltip";
import { formatCalendarDate } from "@flatsby/validators/calendar";
import { barHeights, coversMonth } from "@flatsby/validators/statistics";

const MIN_INNER_LABEL_HEIGHT = 20;

export interface MonthPicker {
  range: StatisticsRange;
  period: Pick<Statistics, "from" | "to">;
  onPick: (month: string) => void;
}

interface Month {
  month: string;
  total: number;
  share?: number;
}

export function MonthBars({
  months,
  height,
  format,
  details,
  picker: { range, period, onPick },
  tint,
}: {
  months: Month[];
  height: number;
  format: (value: number) => string;
  details: (month: Month) => { label: string; value: string }[];
  picker: MonthPicker;
  tint?: string;
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
    <div className="mt-3 flex items-end gap-1">
      {months.map((entry, index) => {
        const { month, total, share } = entry;
        const picked = coversMonth(month, range, period);
        const shareHeight = shares[index] ?? 0;
        const name = formatCalendarDate(`${month}-01`, locale, {
          month: "long",
        });
        const rows = details(entry);
        return (
          <Tooltip key={month}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={picked}
                aria-label={`${name}: ${rows.map(({ label, value }) => `${label} ${value}`).join(", ")}`}
                onClick={() => onPick(month)}
                className={cn(
                  "hover:bg-muted text-muted-foreground flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-xs font-medium tabular-nums transition-colors",
                  picked && "text-foreground font-bold",
                )}
              >
                <span>{format(total)}</span>
                <span
                  className={cn(
                    "relative w-9 overflow-hidden rounded-sm transition-[height,background-color,opacity] duration-300 ease-out motion-reduce:transition-none",
                    share !== undefined
                      ? "bg-muted-foreground/20"
                      : tint
                        ? cn("bg-current", tint, !picked && "opacity-40")
                        : picked
                          ? "bg-foreground"
                          : "bg-muted-foreground/40",
                  )}
                  style={{ height: totals[index] }}
                >
                  {share !== undefined && (
                    <span
                      className={cn(
                        "text-background absolute inset-x-0 bottom-0 flex justify-center overflow-hidden pt-1 font-bold transition-[height,background-color] duration-300 ease-out motion-reduce:transition-none",
                        picked ? "bg-foreground" : "bg-muted-foreground",
                      )}
                      style={{ height: shareHeight }}
                    >
                      {shareHeight >= MIN_INNER_LABEL_HEIGHT && format(share)}
                    </span>
                  )}
                </span>
                <span className="mt-1">
                  {formatCalendarDate(`${month}-01`, locale, {
                    month: "short",
                  })}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="flex flex-col gap-0.5 tabular-nums">
              <span className="font-bold">{name}</span>
              {rows.map(({ label, value }) => (
                <span key={label} className="flex justify-between gap-4">
                  <span className="opacity-70 first-letter:uppercase">
                    {label}
                  </span>
                  <span className="font-bold">{value}</span>
                </span>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
