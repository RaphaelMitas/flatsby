"use client";

import type { Pace, PacePoint } from "@flatsby/validators/home";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { paceChart, paceLabels } from "@flatsby/validators/home";

export const PACE_SIZE = { width: 100, height: 100 };

interface PaceScrub {
  point: PacePoint | null;
  onMove: (x: number | null) => void;
}

export function PaceChart({
  pace,
  today,
  className,
  labelled = false,
  wholeMonth = false,
  fadeIn,
  scrub,
}: {
  pace: Pace;
  today: string;
  className: string;
  labelled?: boolean;
  wholeMonth?: boolean;
  fadeIn: boolean;
  scrub?: PaceScrub;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const gradient = useId();
  const { now, before, area, end, beforeEnd } = paceChart(
    pace,
    today,
    PACE_SIZE,
  );
  const labels = paceLabels(today, locale);

  return (
    <div
      className={cn(
        "mt-2 flex flex-col",
        fadeIn && "animate-in fade-in duration-300",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "text-foreground relative",
          scrub && "cursor-crosshair touch-pan-y",
          className,
        )}
        onPointerMove={
          scrub &&
          ((event) => {
            const box = event.currentTarget.getBoundingClientRect();
            scrub.onMove(
              ((event.clientX - box.left) / box.width) * PACE_SIZE.width,
            );
          })
        }
        onPointerLeave={scrub && (() => scrub.onMove(null))}
        onPointerCancel={scrub && (() => scrub.onMove(null))}
      >
        <svg
          viewBox={`0 0 ${PACE_SIZE.width} ${PACE_SIZE.height}`}
          preserveAspectRatio="none"
          aria-hidden
          className="size-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity={0.13} />
              <stop offset="1" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={PACE_SIZE.height}
            x2={PACE_SIZE.width}
            y2={PACE_SIZE.height}
            vectorEffect="non-scaling-stroke"
            className="stroke-border"
          />
          <path d={area} fill={`url(#${gradient})`} />
          <path
            d={before}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="1 6"
            className="stroke-muted-foreground/40"
          />
          <path
            d={now}
            fill="none"
            vectorEffect="non-scaling-stroke"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className={cn(
            "bg-foreground ring-card absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-3 transition-opacity",
            scrub?.point && "opacity-25",
          )}
          style={{ left: `${end.x}%`, top: `${end.y}%` }}
        />
        {scrub?.point && (
          <>
            <span
              className="bg-border absolute inset-y-0 w-px"
              style={{ left: `${scrub.point.x}%` }}
            />
            {scrub.point.before && (
              <span
                className="bg-card ring-muted-foreground absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
                style={{
                  left: `${scrub.point.before.x}%`,
                  top: `${scrub.point.before.y}%`,
                }}
              />
            )}
            {scrub.point.now && (
              <span
                className="bg-foreground ring-card absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-3"
                style={{
                  left: `${scrub.point.now.x}%`,
                  top: `${scrub.point.now.y}%`,
                }}
              />
            )}
          </>
        )}
        {labelled && (
          <span
            className={cn(
              "text-muted-foreground absolute right-0 text-xs",
              beforeEnd.y > 30 ? "-translate-y-full pb-1" : "pt-2",
            )}
            style={{ top: `${beforeEnd.y}%` }}
          >
            {labels.previousMonth}
          </span>
        )}
      </div>
      {labelled && (
        <div className="text-muted-foreground relative mt-2 h-4 text-xs">
          {end.x > 20 && (
            <span className="absolute left-0">{labels.start}</span>
          )}
          {!wholeMonth && (
            <span
              className={cn(
                "absolute",
                end.x > 90
                  ? "-translate-x-full"
                  : end.x >= 10 && "-translate-x-1/2",
              )}
              style={{ left: `${end.x}%` }}
            >
              {t("calendar.today")}
            </span>
          )}
          {(wholeMonth || end.x < 80) && (
            <span className="absolute right-0">{labels.end}</span>
          )}
        </div>
      )}
    </div>
  );
}
