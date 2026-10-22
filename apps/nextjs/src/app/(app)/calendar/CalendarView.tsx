"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type {
  CalendarEntry,
  CalendarItemView,
  CalendarPosition,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import {
  useEffect,
  useEffectEvent,
  useMemo,
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
  describeListRange,
  formatCalendarDate,
  listAgenda,
  localDate,
  monthAgenda,
  newEntryDate,
  positionWindow,
  showDate,
  shownDates,
  stepPosition,
  switchView,
  weekDays,
} from "@flatsby/validators/calendar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { CalendarItemDetail } from "./CalendarItemDetail";
import { CalendarItemForm } from "./CalendarItemForm";
import { CalendarList } from "./CalendarList";
import { TurnBar } from "./CalendarPeople";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

type Panel =
  | { type: "detail"; entry: CalendarEntry }
  | { type: "form"; item?: CalendarItemView };

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
  const handleApiError = useHandleApiError();
  const { currentGroup } = useGroupContext();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: currentGroup?.id ?? 0 }),
  );
  // "Today" is the viewer's local day, which the server can't know while rendering
  const today = useSyncExternalStore(onReturn, localDate, () => null);

  if (!groupData.success) return handleApiError(groupData.error);
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
  const handleApiError = useHandleApiError();
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
  const range = data?.success ? data.data : undefined;

  usePrefetchQuery(rangeOf(stepPosition(position, -1, today)));
  usePrefetchQuery(rangeOf(stepPosition(position, 1, today)));
  usePrefetchQuery(
    rangeOf(switchView(position, view === "list" ? "month" : "list", today)),
  );

  const {
    setDone: { mutate: setDone },
    setSkipped,
    remove,
    create,
    update,
  } = useCalendarMutations(group);

  const moveTo = (next: CalendarPosition) => {
    setPosition(next);
    setPanel(null);
  };
  const show = (date: string) => moveTo(showDate(position, date, today));
  const step = (delta: number) => moveTo(stepPosition(position, delta, today));
  const atToday = (view === "list" ? position.start : position.month) === null;

  const onArrow = useEffectEvent(step);
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
    return (
      handleApiError(data.error) ?? (
        <p className="text-destructive p-4 text-sm">{data.error.message}</p>
      )
    );

  const list = range
    ? listAgenda(range, start, today, meId, member)
    : undefined;
  const grid = range ? monthAgenda(range, month, meId, member) : undefined;
  const shown = view === "list" ? list : grid;

  const save = async (input: CreateCalendarItemInput, id?: number) => {
    if (id === undefined) {
      // Closing the form first rules out a second submit; the optimistic entry needs its window cached
      const next = showDate(position, input.startsOn, today);
      moveTo(next);
      await queryClient
        .query({ ...rangeOf(next), staleTime: "static" })
        .catch(() => undefined);
      create.mutate(input);
    } else {
      update.mutate({ ...input, id, today });
      setPanel(null);
    }
  };

  const openAdd = () => setPanel({ type: "form" });
  const openEntry = (entry: CalendarEntry) =>
    setPanel({ type: "detail", entry });

  const panelContent = (current: Panel) => {
    if (current.type === "form")
      return (
        <CalendarItemForm
          key={current.item?.id ?? "new"}
          groupId={groupId}
          members={group.groupMembers}
          item={current.item}
          defaultDate={newEntryDate(position, today)}
          today={today}
          onCancel={() => setPanel(null)}
          onSubmit={(input) => void save(input, current.item?.id)}
        />
      );
    const { item, occurrence } = current.entry;
    const skip = (date: string, skipped: boolean) =>
      setSkipped.mutate({ groupId, itemId: item.id, date, skipped });
    return (
      <CalendarItemDetail
        key={`${item.id}-${occurrence.date}`}
        entry={current.entry}
        groupId={groupId}
        meId={meId}
        today={today}
        members={members}
        onEdit={(latest) => setPanel({ type: "form", item: latest })}
        onJump={show}
        onSkip={() => {
          skip(occurrence.date, true);
          setPanel(null);
        }}
        onUnskip={(date) => skip(date, false)}
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
            disabled={atToday}
            onClick={() => show(today)}
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
        turns={shown?.turns ?? new Map()}
        member={member}
        onChange={setMember}
      />
      {view === "list" ? (
        <CalendarList
          agenda={list}
          dates={weekDays(start)}
          today={today}
          meId={meId}
          members={members}
          member={member}
          onToggle={({ item, occurrence }, done, skip) =>
            setDone({
              groupId,
              itemId: item.id,
              date: occurrence.date,
              done,
              // Done once means done now; the days it was left are skipped, not done
              skip: done ? skip : undefined,
            })
          }
          onOpen={openEntry}
        />
      ) : (
        <MonthGrid
          month={month}
          days={grid?.days}
          today={today}
          onSelect={(date) =>
            moveTo(showDate({ ...position, view: "list" }, date, today))
          }
          onOpen={openEntry}
        />
      )}
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
