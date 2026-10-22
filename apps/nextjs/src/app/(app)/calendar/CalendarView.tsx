"use client";

import type { GroupWithAccess } from "@flatsby/api";
import type {
  CalendarEntry,
  CalendarItemView,
  CreateCalendarItemInput,
} from "@flatsby/validators/calendar";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useQueries,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { combineMonths } from "@flatsby/api/calendarCache";
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
  localDate,
  monthGrid,
  monthOf,
  monthsOf,
  spanAround,
  stepFrom,
} from "@flatsby/validators/calendar";

import type { AgendaHandle } from "./Agenda";
import { useGroupContext } from "~/app/_components/context/group-context";
import { useTRPC } from "~/trpc/react";
import { useHandleApiError } from "~/utils";
import { Agenda } from "./Agenda";
import { CalendarItemDetail } from "./CalendarItemDetail";
import { CalendarItemForm } from "./CalendarItemForm";
import { MONTH_COVER, MonthGrid } from "./MonthGrid";
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const handleApiError = useHandleApiError();
  const isLargeScreen = useMediaQuery("lg");
  const [selected, setSelected] = useState(today);
  const [jump, setJump] = useState({ date: today });
  const [span, setSpan] = useState(() => spanAround(today));
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState(false);
  const collapse = useRef(0);
  const monthFrame = useRef<HTMLDivElement>(null);
  const agenda = useRef<AgendaHandle>(null);
  const [mine, setMine] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);

  const groupId = group.id;
  const meId = group.thisGroupMember.id;
  const members = useMemo(
    () => new Map(group.groupMembers.map((member) => [member.id, member])),
    [group.groupMembers],
  );

  const rangeOptions = useCallback(
    (month: string) => {
      const { from, to } = monthGrid(month);
      return trpc.calendar.range.queryOptions({ groupId, from, to });
    },
    [trpc, groupId],
  );
  const months = monthsOf(span);
  const { months: agendaMonths, error } = useQueries({
    queries: months.map(rangeOptions),
    combine: combineMonths(months),
  });
  const rangeOf = (date: string) =>
    agendaMonths.find(({ month }) => month === monthOf(date))?.range;
  // useMutation's result is new every render, its mutate is not; holding the result would re-render the whole agenda on every day scrolled past
  const {
    setDone: { mutate: setDone },
    setSkipped,
    remove,
    create,
    update,
  } = useCalendarMutations(group);

  if (error)
    return (
      handleApiError(error) ?? (
        <p className="text-destructive p-4 text-sm">{error.message}</p>
      )
    );

  const selectDay = (date: string) => {
    setSelected(date);
    setSpan((current) => spanAround(date, current));
    setJump({ date });
    setPanel(null);
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
      update.mutate({ ...input, id, today });
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
        onJump={selectDay}
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
    <div className="mx-auto flex h-full w-full max-w-xl flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2
          className="text-xl font-bold tracking-tight"
          data-testid="calendar-heading"
        >
          {t("calendar.title")}
        </h2>
        <div className="flex items-center gap-2">
          <Tabs
            value={mine ? "mine" : "all"}
            onValueChange={(value) => setMine(value === "mine")}
          >
            <TabsList>
              <TabsTrigger value="all" data-testid="calendar-filter-all">
                {t("calendar.all")}
              </TabsTrigger>
              <TabsTrigger value="mine" data-testid="calendar-filter-mine">
                {t("calendar.mine")}
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
      <MonthGrid
        ref={monthFrame}
        selected={selected}
        today={today}
        rangeOf={rangeOf}
        collapsed={collapsed}
        closed={closed}
        onSelect={selectDay}
        onStep={(delta) =>
          selectDay(stepFrom(selected, today, delta, collapsed))
        }
        onToggleCollapsed={() => agenda.current?.toggleMonth()}
      >
        <Agenda
          months={agendaMonths}
          ref={agenda}
          jump={jump}
          today={today}
          meId={meId}
          members={members}
          mine={mine}
          collapse={collapse}
          onCollapse={(value) => {
            collapse.current = value;
            monthFrame.current?.style.setProperty(
              "--month-collapse",
              `${value}px`,
            );
            setCollapsed(value > MONTH_COVER / 2);
            setClosed(value >= MONTH_COVER - 1);
          }}
          onScrolledTo={setSelected}
          onReachEdge={(month) =>
            setSpan((current) => spanAround(`${month}-01`, current))
          }
          onToggle={({ item, occurrence }, done) =>
            setDone({
              groupId,
              itemId: item.id,
              date: occurrence.date,
              done,
            })
          }
          onOpen={(entry) => setPanel({ type: "detail", entry })}
        />
      </MonthGrid>
    </div>
  );

  if (isLargeScreen)
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
          aria-describedby={undefined}
          className="max-h-11/12 overflow-y-auto rounded-t-2xl px-5 pt-6 pb-8"
        >
          <SheetTitle className="sr-only">{t("calendar.title")}</SheetTitle>
          {panel && panelContent(panel)}
        </SheetContent>
      </Sheet>
    </>
  );
}
