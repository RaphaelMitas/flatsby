"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type {
  CalendarEntry,
  CalendarItemView,
  CalendarRange,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { useMediaQuery } from "@flatsby/ui/hooks/use-media-query";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@flatsby/ui/resizable";
import { ScrollArea } from "@flatsby/ui/scroll-area";
import { Separator } from "@flatsby/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@flatsby/ui/sheet";
import {
  localDate,
  monthGrid,
  monthOf,
  shiftMonth,
  watchLocalDate,
} from "@flatsby/validators/calendar";

import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { CalendarItemDetail } from "./CalendarItemDetail";
import { CalendarItemForm } from "./CalendarItemForm";
import { DayList } from "./DayList";
import { MonthGrid } from "./MonthGrid";
import { useCalendarMutations } from "./useCalendarMutations";

type Panel =
  | { type: "detail"; entry: CalendarEntry }
  | { type: "form"; item?: CalendarItemView };

const EMPTY_RANGE: CalendarRange = { items: [], occurrences: [] };

export function CalendarView() {
  const trpc = useTRPC();
  const handleApiError = useHandleApiError();
  const { currentGroup } = useGroupContext();
  const { data: groupData } = useSuspenseQuery(
    trpc.group.getGroup.queryOptions({ id: currentGroup?.id ?? 0 }),
  );
  // "Today" is the viewer's local day, which the server can't know while rendering
  const today = useSyncExternalStore(watchLocalDate, localDate, () => null);

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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const handleApiError = useHandleApiError();
  const isLargeScreen = useMediaQuery("lg");
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(monthOf(today));
  const [shownToday, setShownToday] = useState(today);
  const [mine, setMine] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);

  const groupId = group.id;
  const meId = group.thisGroupMember.id;
  const members = useMemo(
    () => new Map(group.groupMembers.map((member) => [member.id, member])),
    [group.groupMembers],
  );
  if (today !== shownToday) {
    setShownToday(today);
    if (selected === shownToday) {
      setSelected(today);
      setMonth(monthOf(today));
    }
  }

  const rangeOptions = useCallback(
    (visibleMonth: string) => {
      const { from, to } = monthGrid(visibleMonth);
      return trpc.calendar.range.queryOptions({ groupId, from, to, today });
    },
    [trpc, groupId, today],
  );
  const { data } = useQuery({
    ...rangeOptions(month),
    placeholderData: keepPreviousData,
  });
  useEffect(() => {
    for (const delta of [-1, 1])
      void queryClient.prefetchQuery(rangeOptions(shiftMonth(month, delta)));
  }, [queryClient, rangeOptions, month]);
  const range = data?.success ? data.data : EMPTY_RANGE;
  const { setDone, reschedule, remove, create, update } =
    useCalendarMutations(group);

  if (data?.success === false)
    return (
      handleApiError(data.error) ?? (
        <p className="text-destructive p-4 text-sm">{data.error.message}</p>
      )
    );

  const selectDay = (date: string) => {
    setSelected(date);
    setMonth(monthOf(date));
    setPanel(null);
  };

  const shiftVisibleMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    selectDay(next === monthOf(today) ? today : `${next}-01`);
  };

  const save = async (input: CreateCalendarItemInput, id?: number) => {
    if (id === undefined) {
      // Closing the form first rules out a second submit; the optimistic row needs its month cached
      selectDay(input.startsOn);
      await queryClient
        .query({
          ...rangeOptions(monthOf(input.startsOn)),
          staleTime: "static",
        })
        .catch(() => undefined);
      create.mutate(input);
    } else {
      update.mutate({ ...input, id });
      setPanel(null);
    }
  };

  const openAdd = () => setPanel({ type: "form" });

  const panelContent = (current: Panel) => {
    if (current.type === "form")
      return (
        <CalendarItemForm
          key={current.item?.id ?? "new"}
          groupId={groupId}
          members={group.groupMembers}
          item={current.item}
          defaultDate={selected}
          onCancel={() => setPanel(null)}
          onSubmit={(input) => void save(input, current.item?.id)}
        />
      );
    const { item, occurrence } = current.entry;
    const reschedulePatch = (movedTo: string | null, skipped: boolean) =>
      reschedule.mutate({
        groupId,
        itemId: item.id,
        originalDate: occurrence.originalDate,
        movedTo,
        skipped,
      });
    return (
      <CalendarItemDetail
        key={`${item.id}-${occurrence.originalDate}`}
        entry={current.entry}
        groupId={groupId}
        meId={meId}
        today={today}
        members={members}
        onEdit={(latest) => setPanel({ type: "form", item: latest })}
        onJump={selectDay}
        onSkip={() => {
          reschedulePatch(null, true);
          setPanel(null);
        }}
        onMove={(date) => {
          reschedulePatch(date, false);
          selectDay(date);
        }}
        onUnskip={(originalDate) =>
          reschedule.mutate({
            groupId,
            itemId: item.id,
            originalDate,
            movedTo: null,
            skipped: false,
          })
        }
        onDelete={() => {
          remove.mutate({ groupId, id: item.id });
          setPanel(null);
        }}
      />
    );
  };

  const monthGridView = (
    <MonthGrid
      month={month}
      selected={selected}
      today={today}
      range={range}
      onSelect={selectDay}
      onShiftMonth={shiftVisibleMonth}
    />
  );

  const dayList = (
    <DayList
      date={selected}
      today={today}
      range={range}
      meId={meId}
      members={members}
      mine={mine}
      onMineChange={setMine}
      onToggle={({ item, occurrence }, done) =>
        setDone.mutate({
          groupId,
          itemId: item.id,
          originalDate: occurrence.originalDate,
          done,
          today,
        })
      }
      onOpen={(entry) => setPanel({ type: "detail", entry })}
      onAdd={openAdd}
    />
  );

  const heading = (
    <h2
      className="text-xl font-bold tracking-tight"
      data-testid="calendar-heading"
    >
      {t("calendar.title")}
    </h2>
  );

  if (isLargeScreen)
    return (
      <ResizablePanelGroup orientation="horizontal" className="h-full flex-1">
        <ResizablePanel defaultSize={55} minSize={35}>
          <div className="flex h-full flex-col border-r">
            <div className="flex items-center justify-between gap-2 border-b p-4">
              {heading}
              <Button size="sm" onClick={openAdd} data-testid="calendar-add">
                <Plus />
                {t("calendar.add")}
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="mx-auto w-full max-w-xl p-4">{monthGridView}</div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={45} minSize={30}>
          <ScrollArea className="h-full">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
              {panel ? (
                <>
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
                </>
              ) : (
                dayList
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pb-24">
      {heading}
      {monthGridView}
      <Separator />
      {dayList}
      <Button
        size="icon-lg"
        onClick={openAdd}
        aria-label={t("calendar.add")}
        className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg md:bottom-6"
        data-testid="calendar-add"
      >
        <Plus className="size-6" />
      </Button>
      <Sheet
        open={panel !== null}
        onOpenChange={(open) => !open && setPanel(null)}
      >
        <SheetContent
          side="bottom"
          className="max-h-11/12 overflow-y-auto rounded-t-2xl px-5 pt-6 pb-8"
        >
          <SheetTitle className="sr-only">{t("calendar.title")}</SheetTitle>
          {panel && panelContent(panel)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
