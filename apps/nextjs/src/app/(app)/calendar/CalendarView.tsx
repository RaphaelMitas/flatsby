"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type {
  AgendaEntry,
  CalendarItemView,
  CalendarPosition,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  usePrefetchQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@flatsby/ui";
import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { useMediaQuery } from "@flatsby/ui/hooks/use-media-query";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@flatsby/ui/resizable";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@flatsby/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@flatsby/ui/tabs";
import {
  agendaAt,
  describeListRange,
  formatCalendarDate,
  localDate,
  newEntryDate,
  otherView,
  positionWindow,
  revealDate,
  showDate,
  shownDates,
  showsToday,
  stepPosition,
  switchView,
  tickInput,
  todayPosition,
  weekDays,
} from "@flatsby/validators/calendar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { CalendarItemDetail } from "./CalendarItemDetail";
import { CalendarItemForm } from "./CalendarItemForm";
import { CalendarList } from "./CalendarList";
import { TurnBar } from "./CalendarPeople";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

const SWIPE_DISTANCE = 60;

type Panel =
  | { type: "detail"; entry: AgendaEntry }
  | { type: "form"; item?: CalendarItemView; date?: string };

// Coming back to a tab left open overnight has to move "today" along
const onReturn = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  window.addEventListener("focus", notify);
  return () => {
    document.removeEventListener("visibilitychange", notify);
    window.removeEventListener("focus", notify);
  };
};

export function CalendarView() {
  const trpc = useTRPC();
  const { currentGroup } = useGroupContext();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: currentGroup?.id ?? 0 }),
  );
  // "Today" is the viewer's local day, which the server can't know while rendering
  const today = useSyncExternalStore(onReturn, localDate, () => null);

  if (!groupData.success) return null;
  if (!today)
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  return (
    <CalendarScreen
      key={groupData.data.id}
      group={groupData.data}
      today={today}
    />
  );
}

function CalendarScreen({
  group,
  today,
}: {
  group: GroupWithAccess;
  today: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isLargeScreen = useMediaQuery("lg");
  const [position, setPosition] = useState<CalendarPosition>({
    view: "month",
    start: null,
    month: null,
  });
  const [member, setMember] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);

  const groupId = group.id;
  const meId = group.thisGroupMember.id;
  const members = useMemo(
    () => new Map(group.groupMembers.map((member) => [member.id, member])),
    [group.groupMembers],
  );
  const { view } = position;
  const { start, month } = shownDates(position, today);
  const rangeOf = (at: CalendarPosition) =>
    trpc.calendar.range.queryOptions({
      groupId,
      ...positionWindow(at, today),
    });
  const { data } = useQuery(rangeOf(position));
  usePrefetchQuery(rangeOf(stepPosition(position, -1, today)));
  usePrefetchQuery(rangeOf(stepPosition(position, 1, today)));
  usePrefetchQuery(rangeOf(switchView(position, otherView(position), today)));

  const {
    setDone: { mutate: setDone },
    setSkipped,
    remove,
    create,
    update,
  } = useCalendarMutations(group);

  // Stepping keeps a half-filled form; a view switch moves the panel to another container, which would remount it empty
  const moveTo = (next: CalendarPosition) => {
    setPosition(next);
    setPanel((open) =>
      open?.type === "form" && next.view === position.view ? open : null,
    );
  };
  const step = (delta: number) => moveTo(stepPosition(position, delta, today));
  const swipeStart = useRef<{ x: number; y: number } | undefined>(undefined);

  // Arrow keys belong to an open form or detail
  const onArrow = useEffectEvent((delta: number) => {
    if (!panel) step(delta);
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, [contenteditable], [role=dialog], [role=tab], [role=separator]",
          ))
      )
        return;
      if (event.key === "ArrowLeft") onArrow(-1);
      if (event.key === "ArrowRight") onArrow(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (data?.success === false)
    return <p className="text-destructive p-4 text-sm">{data.error.message}</p>;

  const agenda = data?.success
    ? agendaAt(data.data, position, today, meId, member)
    : undefined;

  const save = async (input: CreateCalendarItemInput, id?: number) => {
    if (id === undefined) {
      // Closing the form first rules out a second submit; the optimistic entry needs its range cached
      const next = revealDate(position, input.startsOn, today);
      moveTo(next);
      setPanel(null);
      await queryClient
        .query({ ...rangeOf(next), staleTime: "static" })
        .catch(() => undefined);
      create.mutate(input);
    } else {
      update.mutate({ ...input, id, today });
      setPanel(null);
    }
  };

  const openAdd = () =>
    setPanel({ type: "form", date: newEntryDate(position, today) });
  const openEntry = (entry: AgendaEntry) => setPanel({ type: "detail", entry });

  const panelContent = (current: Panel) => {
    if (current.type === "form")
      return (
        <CalendarItemForm
          key={current.item?.id ?? "new"}
          groupId={groupId}
          members={group.groupMembers}
          item={current.item}
          defaultDate={current.date ?? today}
          today={today}
          onCancel={() => setPanel(null)}
          onSubmit={(input) => void save(input, current.item?.id)}
        />
      );
    const { item, occurrence } = current.entry;
    return (
      <CalendarItemDetail
        key={`${item.id}-${occurrence.date}`}
        entry={current.entry}
        groupId={groupId}
        meId={meId}
        today={today}
        members={members}
        onEdit={(latest) => setPanel({ type: "form", item: latest })}
        onJump={(date) => moveTo(revealDate(position, date, today))}
        onSkip={() => {
          // A chore left for days is skipped for all of them, or the next one would take its place
          setSkipped.mutate({
            groupId,
            itemId: item.id,
            date: occurrence.date,
            skipped: true,
            missed: current.entry.missed,
          });
          setPanel(null);
        }}
        onUnskip={(date) =>
          setSkipped.mutate({ groupId, itemId: item.id, date, skipped: false })
        }
        onDelete={() => {
          remove.mutate({ groupId, id: item.id });
          setPanel(null);
        }}
      />
    );
  };

  const calendar = (
    <div
      className={cn(
        "mx-auto flex h-full w-full flex-col",
        view === "list" && "max-w-xl",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2
          className="text-xl font-bold tracking-tight"
          data-testid="calendar-heading"
        >
          {t("calendar.title")}
        </h2>
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(value) =>
              moveTo(
                switchView(
                  position,
                  value === "list" ? "list" : "month",
                  today,
                ),
              )
            }
          >
            <TabsList>
              <TabsTrigger value="list" data-testid="calendar-view-list">
                {t("calendar.list")}
              </TabsTrigger>
              <TabsTrigger value="month" data-testid="calendar-view-month">
                {t("calendar.month")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {isLargeScreen && (
            <Button size="sm" onClick={openAdd} data-testid="calendar-add">
              <Plus />
              {t("calendar.add")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        {view === "list" ? (
          <Button
            variant="ghost"
            onClick={() => moveTo(switchView(position, "month", today))}
            className="-ml-3 text-lg font-semibold"
            data-testid="calendar-range-title"
          >
            {describeListRange(start, locale)}
          </Button>
        ) : (
          <h3
            className="text-lg font-semibold"
            data-testid="calendar-range-title"
          >
            {formatCalendarDate(`${month}-01`, locale, {
              month: "long",
              year: "numeric",
            })}
          </h3>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={showsToday(position)}
            onClick={() => moveTo(todayPosition(position))}
            data-testid="calendar-today-button"
          >
            {t("calendar.today")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              view === "list"
                ? t("calendar.previousWeek")
                : t("calendar.previousMonth")
            }
            onClick={() => step(-1)}
            data-testid="calendar-previous"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              view === "list" ? t("calendar.nextWeek") : t("calendar.nextMonth")
            }
            onClick={() => step(1)}
            data-testid="calendar-next"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <TurnBar
        members={members}
        meId={meId}
        turns={agenda?.turns ?? new Map()}
        member={member}
        onChange={setMember}
      />
      <div
        className="flex min-h-0 flex-1 flex-col"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          swipeStart.current = touch && { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const from = swipeStart.current;
          const touch = event.changedTouches[0];
          if (!from || !touch) return;
          const dx = touch.clientX - from.x;
          if (
            Math.abs(dx) > SWIPE_DISTANCE &&
            Math.abs(dx) > 2 * Math.abs(touch.clientY - from.y)
          )
            step(dx < 0 ? 1 : -1);
        }}
      >
        {view === "list" ? (
          <CalendarList
            agenda={agenda}
            dates={weekDays(start)}
            today={today}
            meId={meId}
            members={members}
            member={member}
            onToggle={(entry, done) => setDone(tickInput(groupId, entry, done))}
            onOpen={openEntry}
          />
        ) : (
          <MonthGrid
            month={month}
            days={agenda?.days}
            today={today}
            onSelect={(date) =>
              moveTo(showDate({ ...position, view: "list" }, date, today))
            }
            onOpen={openEntry}
          />
        )}
      </div>
    </div>
  );

  if (isLargeScreen && view === "list")
    return (
      <ResizablePanelGroup orientation="horizontal" className="h-full flex-1">
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="h-full border-r">{calendar}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={30}>
          {panel ? (
            <ScrollArea className="h-full">
              <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setPanel(null)}
                >
                  <ArrowLeft />
                  {t("common.back")}
                </Button>
                {panelContent(panel)}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <CalendarDays className="text-muted-foreground size-16" />
              <div>
                <p className="text-lg font-semibold">
                  {t("calendar.selectEntry")}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t("calendar.selectEntryHint")}
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    );

  return (
    <>
      {calendar}
      {!isLargeScreen && (
        <Button
          size="icon-lg"
          onClick={openAdd}
          aria-label={t("calendar.add")}
          className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg md:bottom-6"
          data-testid="calendar-add"
        >
          <Plus className="size-6" />
        </Button>
      )}
      <Sheet
        open={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
      >
        <SheetContent
          side={isLargeScreen ? "right" : "bottom"}
          aria-describedby={undefined}
          className={cn(
            "overflow-y-auto px-5 pt-6 pb-8",
            isLargeScreen ? "w-full sm:max-w-lg" : "max-h-11/12 rounded-t-2xl",
          )}
        >
          <SheetTitle className="sr-only">{t("calendar.title")}</SheetTitle>
          {panel && panelContent(panel)}
        </SheetContent>
      </Sheet>
    </>
  );
}
