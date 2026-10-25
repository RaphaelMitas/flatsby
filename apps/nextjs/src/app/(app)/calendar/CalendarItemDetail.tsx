"use client";

import type {
  CalendarEntry,
  CalendarItemView,
} from "@flatsby/validators/calendar";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleCheckBig, Clock, Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Badge } from "@flatsby/ui/badge";
import { Button } from "@flatsby/ui/button";
import {
  describeEventTime,
  describeSeries,
  formatCalendarDate,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";

import type { MemberLookup } from "./CalendarPeople";
import { useTRPC } from "~/trpc/react";
import { DoneBy, MemberPill, TurnPill } from "./CalendarPeople";

const pillClass = "gap-1.5 rounded-full border-transparent py-1";

interface CalendarItemDetailProps {
  entry: CalendarEntry;
  groupId: number;
  meId: number;
  today: string;
  members: MemberLookup;
  onEdit: (item: CalendarItemView) => void;
  onJump: (date: string) => void;
  onSkip: () => void;
  onUnskip: (date: string) => void;
  onDelete: () => void;
}

export function CalendarItemDetail({
  entry,
  groupId,
  meId,
  today,
  members,
  onEdit,
  onJump,
  onSkip,
  onUnskip,
  onDelete,
}: CalendarItemDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const [armed, setArmed] = useState(false);

  const { data } = useQuery(
    trpc.calendar.item.queryOptions({ groupId, id: entry.item.id, today }),
  );
  if (data?.success === false)
    return <p className="text-destructive text-sm">{data.error.message}</p>;
  const detail = data?.success ? data.data : null;
  const item = detail?.item ?? entry.item;
  const isTask = item.kind === "task";
  const canSkip = item.recurrence !== null;
  const currentTurn =
    detail?.upcoming[0]?.turnGroupMemberId ??
    entry.occurrence.turnGroupMemberId;
  const dayLabel = (date: string) =>
    date === today
      ? t("calendar.today")
      : formatCalendarDate(date, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

  return (
    <div className="flex flex-col gap-5" data-testid="calendar-detail">
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2.5 pr-8 text-2xl font-bold tracking-tight">
          <span
            className={cn(
              "size-3 shrink-0 rounded-full",
              categoryFillColorMap[item.color],
            )}
          />
          {item.title}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className={pillClass}>
            {isTask ? (
              <CircleCheckBig className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
            {t(`calendar.kind.${item.kind}`)}
          </Badge>
          <Badge variant="secondary" className={pillClass}>
            <Repeat className="size-3.5" />
            {describeSeries(item, today, t, locale)}
          </Badge>
          {!isTask && (
            <Badge variant="secondary" className={pillClass}>
              {describeEventTime(item, t, locale)}
            </Badge>
          )}
        </div>
      </div>

      {isTask && (
        <Section
          label={
            item.memberIds.length > 1
              ? t("calendar.detail.order")
              : t("calendar.form.who")
          }
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {item.memberIds.length === 0 ? (
              <MemberPill member={undefined}>
                <span className="pl-2">{t("calendar.anyone")}</span>
              </MemberPill>
            ) : (
              item.memberIds.map((memberId, index) => (
                <span key={memberId} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ArrowRight className="text-muted-foreground size-3.5" />
                  )}
                  <MemberPill
                    member={members.get(memberId)}
                    highlighted={memberId === currentTurn}
                  >
                    {members.get(memberId)?.user.name ?? t("common.unknown")}
                  </MemberPill>
                </span>
              ))
            )}
          </div>
        </Section>
      )}

      {detail && detail.upcoming.length > 0 && (
        <Section label={t("calendar.detail.comingUp")}>
          <ul className="divide-y overflow-hidden rounded-xl border">
            {detail.upcoming.map((occurrence) => (
              <li key={occurrence.date}>
                <button
                  type="button"
                  onClick={() => onJump(occurrence.date)}
                  className="hover:bg-muted/60 flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                >
                  {dayLabel(occurrence.date)}
                  {occurrence.turnGroupMemberId !== null && (
                    <TurnPill
                      memberId={occurrence.turnGroupMemberId}
                      meId={meId}
                      members={members}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {detail && (isTask || detail.history.length > 0) && (
        <Section label={t("calendar.detail.history")}>
          {detail.history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("calendar.detail.noHistory")}
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border">
              {detail.history.map((row) => (
                <li
                  key={row.date}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  {dayLabel(row.date)}
                  {row.skipped ? (
                    <span className="text-muted-foreground flex items-center gap-2 text-xs">
                      {t("calendar.detail.skipped")}
                      {canSkip && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => onUnskip(row.date)}
                        >
                          {t("calendar.detail.unskip")}
                        </Button>
                      )}
                    </span>
                  ) : (
                    <DoneBy completedBy={row.completedBy} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onEdit(item)}
          data-testid="calendar-detail-edit"
        >
          {t("calendar.detail.edit")}
        </Button>
        {canSkip && !entry.occurrence.completedAt && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSkip}
            data-testid="calendar-detail-skip"
          >
            {t("calendar.detail.skip")}
          </Button>
        )}
      </div>
      <Button
        variant={armed ? "destructive" : "outline"}
        className={cn("w-full", !armed && "text-destructive")}
        onClick={() => (armed ? onDelete() : setArmed(true))}
        data-testid="calendar-detail-delete"
      >
        {armed
          ? t("calendar.detail.confirmDelete")
          : t("calendar.detail.delete")}
      </Button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-sm font-semibold">{label}</h3>
      {children}
    </section>
  );
}
