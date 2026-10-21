import type { GroupWithAccess, ShoppingListSummary } from "@flatsby/api";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  useInfiniteQuery,
  useQueryClient,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  addDays,
  formatCalendarDate,
  HOME_LOOKAHEAD_DAYS,
  HOME_LOOKBACK_DAYS,
  homeAgenda,
  localDate,
} from "@flatsby/validators/calendar";
import { myDebts } from "@flatsby/validators/expenses/debt";
import {
  formatCurrencyFromCents,
  personLookup,
} from "@flatsby/validators/expenses/formatting";

import type { Nudge } from "./ForYouCard";
import type { CatPose } from "./HomeCat";
import type { HomeRowProps } from "./HomeRows";
import { useCalendarMutations } from "~/components/calendar/useCalendarMutations";
import { settleHref } from "~/components/expenses/settleHref";
import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { GroupGate } from "~/components/GroupGate";
import { shoppingListItemsOptions } from "~/components/shoppingList/ShoppingListUtils";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { BottomSheetPickerProvider } from "~/lib/ui/bottom-sheet-picker";
import Icon from "~/lib/ui/custom/icons/Icon";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useGroupPicker } from "../dashboard/useGroupPicker";
import { ForYouCard } from "./ForYouCard";
import {
  CountLead,
  DateLead,
  DoneLead,
  HomeRow,
  HomeRows,
  PersonLead,
} from "./HomeRows";
import { SwitchBack } from "./HomeSwitch";
import { QuickAddDial } from "./QuickAddDial";

export function NewHome() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return <GroupsDashboard />;
  }

  return (
    <BottomSheetPickerProvider>
      <GroupGate>
        {(group) => <HomeScreen key={group.id} group={group} />}
      </GroupGate>
    </BottomSheetPickerProvider>
  );
}

const greetingFor = (hour: number) =>
  hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

function useSpeech() {
  const [speech, setSpeech] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const say = (text: string) => {
    clearTimeout(timer.current);
    setSpeech(text);
    timer.current = setTimeout(() => setSpeech(null), 1700);
  };
  return [speech, say] as const;
}

function HomeScreen({ group }: { group: GroupWithAccess }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const openGroupPicker = useGroupPicker();
  const { selectedShoppingListId, setSelectedShoppingList } =
    useShoppingStore();
  const { setDone } = useCalendarMutations(group);
  const [speech, say] = useSpeech();
  const [stretchKey, setStretchKey] = useState(0);

  const today = localDate();
  const meId = group.thisGroupMember.id;
  const person = personLookup(group.groupMembers, meId, t);

  const [{ data: rangeData }, { data: debtData }, { data: listsData }] =
    useSuspenseQueries({
      queries: [
        trpc.calendar.range.queryOptions({
          groupId: group.id,
          from: addDays(today, -HOME_LOOKBACK_DAYS),
          to: addDays(today, HOME_LOOKAHEAD_DAYS),
        }),
        trpc.expense.getDebtSummary.queryOptions({ groupId: group.id }),
        trpc.shoppingList.getShoppingLists.queryOptions({ groupId: group.id }),
      ],
    });

  const agenda = rangeData.success
    ? homeAgenda(rangeData.data, today, meId)
    : { due: [], nextTurn: undefined, nextEvent: undefined };
  const { owe, owed } = debtData.success
    ? myDebts(debtData.data, meId, group.currency)
    : { owe: [], owed: [] };
  const lists = listsData.success ? listsData.data : [];
  const lastList =
    lists.find(({ id }) => id === selectedShoppingListId) ?? lists[0];

  const { data: itemsData } = useInfiniteQuery({
    ...shoppingListItemsOptions(group.id, lastList?.id ?? 0),
    enabled: lastList !== undefined,
  });
  const openItems = (
    itemsData?.pages[0]?.success ? itemsData.pages[0].data.items : []
  )
    .filter(({ completed }) => !completed)
    .slice(0, 2)
    .map(({ name }) => name);

  const firstDebt = owe[0];
  const shownChores = agenda.due.slice(0, firstDebt ? 1 : 2);
  const chores = shownChores.map((entry, index): Nudge => ({
    kind: "chore",
    entry,
    overdue: entry.occurrence.date < today,
    more:
      index === shownChores.length - 1
        ? agenda.due.length - shownChores.length
        : 0,
  }));
  const nudges: Nudge[] = [
    ...chores.slice(0, 1),
    ...(firstDebt
      ? [{ kind: "debt", debt: firstDebt, more: owe.length - 1 } as const]
      : []),
    ...chores.slice(1),
  ];

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.calendar.range.pathFilter()),
      queryClient.invalidateQueries(trpc.expense.getDebtSummary.pathFilter()),
      queryClient.invalidateQueries(
        trpc.shoppingList.getShoppingLists.pathFilter(),
      ),
      queryClient.invalidateQueries(
        trpc.shoppingList.getShoppingListItems.pathFilter(),
      ),
    ]);

  const openCalendar = (date?: string) =>
    router.navigate({
      pathname: "/(tabs)/calendar",
      params: date ? { date } : {},
    });
  const dayAndTime = (date: string, start?: string) =>
    [formatCalendarDate(date, locale, { weekday: "short" }), start]
      .filter(Boolean)
      .join(" ");

  const openList = (list: ShoppingListSummary, focus = false) => {
    if (list.id !== selectedShoppingListId) {
      setSelectedShoppingList(list.id, list.name);
    }
    router.navigate({
      pathname: "/(tabs)/shoppingList",
      params: focus ? { focus: "1" } : {},
    });
  };
  const openDebts = () =>
    router.navigate("/(tabs)/expenses/debts", { withAnchor: true });
  const { nextTurn, nextEvent } = agenda;
  const firstOwed = owed[0];
  const from = firstOwed && person(firstOwed.fromGroupMemberId);
  const listCount = lastList?.uncheckedItemLength ?? 0;

  const candidates: (HomeRowProps | false | undefined)[] = [
    from && firstOwed
      ? {
          testID: "home-row-money",
          lead: <PersonLead person={from} />,
          label: t("home.new.owesYou", { name: from.name }),
          value: formatCurrencyFromCents({
            cents: firstOwed.amountInCents,
            currency: firstOwed.currency,
            locale,
          }),
          onPress: openDebts,
        }
      : owe.length === 0 && {
          testID: "home-row-money",
          lead: <DoneLead />,
          label: t("home.new.allSquare"),
          muted: true,
          onPress: openDebts,
        },
    agenda.due.length === 0 &&
      (nextTurn
        ? {
            testID: "home-row-chores",
            lead: (
              <DateLead
                date={nextTurn.occurrence.date}
                color={nextTurn.item.color}
              />
            ),
            label: t("home.new.nextTurn", { title: nextTurn.item.title }),
            value: dayAndTime(nextTurn.occurrence.date),
            onPress: () => openCalendar(nextTurn.occurrence.date),
          }
        : {
            testID: "home-row-chores",
            lead: <DoneLead />,
            label: t("home.new.nothingDue"),
            muted: true,
            onPress: () => openCalendar(),
          }),
    nextEvent && {
      testID: "home-row-event",
      lead: (
        <DateLead
          date={nextEvent.occurrence.date}
          color={nextEvent.item.color}
        />
      ),
      label: nextEvent.item.title,
      value: dayAndTime(nextEvent.occurrence.date, nextEvent.item.time?.start),
      onPress: () => openCalendar(nextEvent.occurrence.date),
    },
    lastList && {
      testID: "home-row-list",
      lead: listCount > 0 ? <CountLead count={listCount} /> : <DoneLead />,
      label: lastList.name,
      value: listCount > 0 ? openItems.join(", ") : t("home.new.nothingToBuy"),
      muted: listCount === 0,
      onPress: () => openList(lastList),
    },
  ];
  const rows = candidates.filter((row): row is HomeRowProps => Boolean(row));

  const catLines: Record<CatPose, string> = {
    sitting: t("home.new.cat.sitting"),
    peeking: t("home.new.cat.peeking"),
    asleep: t("home.new.cat.asleep"),
  };
  const firstName = group.thisGroupMember.user.name.split(" ")[0] ?? "";

  return (
    <View className="flex-1">
      <AppScrollView contentContainerClassName="px-5 pb-32" onRefresh={refresh}>
        <Pressable
          testID="home-group-picker"
          onPress={openGroupPicker}
          className="flex-row items-center gap-1 self-start py-2"
        >
          <Text className="text-muted-foreground text-sm font-semibold">
            {group.name}
          </Text>
          <Icon name="chevron-down" size={15} color="muted-foreground" />
        </Pressable>

        <View className="pr-20">
          <Text
            testID="home-greeting"
            className="text-foreground text-4xl font-extrabold tracking-tight"
          >
            {t(`home.new.greeting.${greetingFor(new Date().getHours())}`, {
              name: firstName,
            })}
          </Text>
          <View className="mt-1.5 h-5">
            {!speech && (
              <Animated.Text
                entering={FadeIn}
                exiting={FadeOut.duration(120)}
                className="text-muted-foreground text-sm"
              >
                {t("home.new.summary", {
                  count: agenda.due.length + owe.length,
                })}
              </Animated.Text>
            )}
          </View>
        </View>

        <ForYouCard
          nudges={nudges}
          person={person}
          speech={speech}
          stretchKey={stretchKey}
          onCatPress={(pose) => say(catLines[pose])}
          onTick={(entry) => {
            setDone.mutate({
              groupId: group.id,
              itemId: entry.item.id,
              date: entry.occurrence.date,
              done: true,
            });
            setStretchKey((key) => key + 1);
            say(t("home.new.cat.ticked"));
          }}
          onSettle={(debt) =>
            router.push(settleHref(debt, "simplified"), { withAnchor: true })
          }
        />

        {rows.length > 0 && (
          <HomeRows title={t("home.new.household")}>
            {rows.map((row, index) => (
              <HomeRow key={row.testID} {...row} first={index === 0} />
            ))}
          </HomeRows>
        )}

        <SwitchBack />
      </AppScrollView>

      <QuickAddDial
        groupId={group.id}
        last={lastList}
        others={lists.filter((list) => list !== lastList)}
        onOpenList={(list) => openList(list, true)}
      />
    </View>
  );
}
