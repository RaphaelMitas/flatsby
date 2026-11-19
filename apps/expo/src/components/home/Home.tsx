import type { GroupWithAccess } from "@flatsby/api";
import type { CalendarRange } from "@flatsby/validators/calendar";
import type { HomeCardName } from "@flatsby/validators/home";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import {
  describeNextEvent,
  deviceTimeZone,
  homeAgenda,
  listWindow,
  localDate,
} from "@flatsby/validators/calendar";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";

import type { CatPose } from "./HomeCat";
import { AnalyticsPrompt } from "~/components/analytics/AnalyticsPrompt";
import { fromPickerTime } from "~/components/calendar/calendarDates";
import {
  calendarRangeOptions,
  lastKnownCalendarRange,
} from "~/components/calendar/calendarRangeOptions";
import { GroupsDashboard } from "~/components/groupDashboard/GroupsDashboard";
import { GroupGate } from "~/components/GroupGate";
import { GroupSwitcher } from "~/components/switcher/GroupSwitcher";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import { season } from "~/lib/seasonal/season";
import Icon from "~/lib/ui/custom/icons/Icon";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import { useNow } from "~/utils/useNow";
import { CategoryStack } from "./CategoryStack";
import { HomeCard, PaceHeadline } from "./HomeCard";
import { CatOverlay, HomeCat } from "./HomeCat";
import { InviteFlatmatesCard } from "./InviteFlatmatesCard";
import { PaceChart } from "./PaceChart";
import { CAT_SIZE } from "./useCatTap";
import { WeekStrip } from "./WeekStrip";

export function Home() {
  const { selectedGroupId } = useShoppingStore();

  if (!selectedGroupId) {
    return <GroupsDashboard />;
  }

  return (
    <GroupGate>
      {(group) => <HomeScreen key={group.id} group={group} />}
    </GroupGate>
  );
}

const home = season.home;

const greetingShadow = home && {
  textShadowColor: `${home.sky}88`,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 12,
};

const POSES: CatPose[] = ["asleep", "peeking", "sitting"];

const NOTHING_PLANNED: CalendarRange = { items: [], occurrences: [] };

function StatusBarSky({ color }: { color: string }) {
  const isFocused = useIsFocused();

  return (
    <>
      <View
        pointerEvents="none"
        className="absolute inset-x-0"
        style={{ bottom: "100%", height: 200, backgroundColor: color }}
      />
      {isFocused && <StatusBar style="light" />}
    </>
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
  const { selectedShoppingListId, setSelectedShoppingList } =
    useShoppingStore();
  const [speech, say] = useSpeech();

  const now = useNow();
  const today = localDate(now);
  const meId = group.thisGroupMember.id;

  const { data: rangeData } = useQuery({
    ...calendarRangeOptions(group.id, listWindow(today, today)),
    placeholderData: (previous) =>
      previous ?? lastKnownCalendarRange(group.id, today),
  });
  const { data: listsData } = useQuery(
    trpc.shoppingList.getShoppingLists.queryOptions({ groupId: group.id }),
  );
  const { data: paceData } = useQuery(
    trpc.stats.getHomePace.queryOptions({
      groupId: group.id,
      timeZone: deviceTimeZone(),
    }),
  );
  const opened = useMutation(trpc.stats.homeCardOpened.mutationOptions());
  const count = (card: HomeCardName) =>
    opened.mutate({ groupId: group.id, card });

  const settled = useIsMutating() === 0;
  useFocusEffect(
    useCallback(() => {
      if (!settled) return;
      void queryClient.refetchQueries(
        { ...trpc.stats.getHomePace.pathFilter(), stale: true, type: "active" },
        { cancelRefetch: false },
      );
    }, [queryClient, settled]),
  );

  const { due, days, nextEvent } = homeAgenda(
    rangeData?.success ? rangeData.data : NOTHING_PLANNED,
    today,
    fromPickerTime(now),
    meId,
  );
  const lists = listsData?.success ? listsData.data : [];
  const lastList =
    lists.find(({ id }) => id === selectedShoppingListId) ?? lists[0];
  const openCount = lastList?.uncheckedItemLength ?? 0;
  const pace = paceData?.success ? paceData.data : undefined;
  const [startedEmpty] = useState(pace === undefined);

  const { data: countsData } = useQuery({
    ...trpc.shoppingList.getCategoryCounts.queryOptions({
      groupId: group.id,
      shoppingListId: lastList?.id ?? 0,
    }),
    enabled: lastList !== undefined,
  });
  const categoryCounts = countsData?.success ? countsData.data.counts : {};

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.calendar.range.pathFilter()),
      queryClient.invalidateQueries(trpc.group.getGroup.pathFilter()),
      queryClient.invalidateQueries(trpc.group.getUserGroups.pathFilter()),
      queryClient.invalidateQueries(
        trpc.shoppingList.getShoppingLists.pathFilter(),
      ),
      queryClient.invalidateQueries(
        trpc.shoppingList.getCategoryCounts.pathFilter(),
      ),
      queryClient.invalidateQueries(trpc.stats.getHomePace.pathFilter()),
    ]);

  const openCalendar = (date?: string) =>
    router.navigate({
      pathname: "/(tabs)/calendar",
      params: date ? { date } : {},
    });
  const openShopping = () => {
    if (lastList && lastList.id !== selectedShoppingListId) {
      setSelectedShoppingList(lastList.id, lastList.name);
    }
    router.navigate("/(tabs)/shoppingList");
  };

  const firstDue = due[0];
  const pose = POSES[Math.min(due.length, 2)] ?? "asleep";
  const firstName = group.thisGroupMember.user.name.split(" ")[0] ?? "";

  return (
    <View className="flex-1">
      {home && <StatusBarSky color={home.sky} />}
      <AppScrollView contentContainerClassName="px-5 pb-32" onRefresh={refresh}>
        <View>
          {home && (
            <View
              className="absolute -inset-x-5 top-0"
              style={{ bottom: -CAT_SIZE - 6 }}
            >
              <home.Backdrop />
            </View>
          )}
          <GroupSwitcher
            testID="home-group-picker"
            settingsTestID="home-group-settings"
            className="mt-2 mb-4"
          />

          <View className="pr-20">
            <Text
              testID="home-greeting"
              className={cn(
                "text-4xl font-extrabold tracking-tight",
                home ? "text-white" : "text-foreground",
              )}
              style={greetingShadow}
            >
              {t(`home.greeting.${greetingFor(now.getHours())}`, {
                name: firstName,
              })}
            </Text>
          </View>

          {firstDue && (
            <Pressable
              testID="home-turn"
              accessibilityRole="button"
              onPress={() => {
                count("turn");
                openCalendar(firstDue.occurrence.date);
              }}
              className="mt-3 flex-row items-center gap-2.5 active:opacity-70"
            >
              <View
                className={cn(
                  "h-2 w-2 rounded-full",
                  categoryFillColorMap[firstDue.item.color],
                )}
              />
              <Text
                numberOfLines={1}
                className={cn(
                  "shrink text-base font-semibold",
                  home ? "text-white" : "text-foreground",
                )}
                style={greetingShadow}
              >
                {firstDue.item.title}
              </Text>
              <Text
                numberOfLines={1}
                className={cn(
                  "flex-1 text-base",
                  home ? "text-white opacity-80" : "text-muted-foreground",
                )}
                style={greetingShadow}
              >
                {t("calendar.yourTurn")}
                {due.length > 1 &&
                  ` · ${t("home.more", { count: due.length - 1 })}`}
              </Text>
              <Icon
                name="chevron-right"
                size={16}
                className={home ? "text-white" : "text-muted-foreground"}
              />
            </Pressable>
          )}
        </View>

        <View className="gap-4 pt-16">
          <HomeCat pose={pose} onPress={() => say(t(`home.cat.${pose}`))} />
          <InviteFlatmatesCard groupId={group.id} />
          <AnalyticsPrompt />
          <HomeCard
            testID="home-card-expenses"
            title={t("navigation.expenses")}
            onPress={() => {
              count("expenses");
              router.navigate("/(tabs)/expenses");
            }}
          >
            <PaceHeadline
              pace={pace?.spending}
              today={pace?.today}
              fadeIn={startedEmpty}
              format={(cents) =>
                formatCurrencyFromCents({
                  cents,
                  currency: group.currency,
                  locale,
                })
              }
            />
            <PaceChart
              pace={pace?.spending}
              today={pace?.today}
              height={80}
              labelled
              drawIn={startedEmpty}
            />
          </HomeCard>
          <CatOverlay pose={pose} speech={speech} />
        </View>

        <HomeCard
          testID="home-card-shopping"
          title={t("navigation.shopping")}
          onPress={() => {
            count("shopping");
            openShopping();
          }}
          className="mt-4"
        >
          <PaceHeadline
            pace={pace?.itemsBought}
            today={pace?.today}
            fadeIn={startedEmpty}
            format={String}
            unit={(items) => t("home.itemsBought", { count: items })}
          />
          <PaceChart
            pace={pace?.itemsBought}
            today={pace?.today}
            height={44}
            drawIn={startedEmpty}
          />
          {lastList && (
            <View className="mt-4 min-h-9 flex-row items-center gap-3">
              {openCount > 0 && <CategoryStack counts={categoryCounts} />}
              <Text
                numberOfLines={1}
                className="text-foreground flex-1 text-base font-semibold"
              >
                {lastList.name}
              </Text>
              <Text className="text-muted-foreground text-base">
                {openCount > 0
                  ? t("home.open", { count: openCount })
                  : t("home.nothingToBuy")}
              </Text>
            </View>
          )}
        </HomeCard>

        <HomeCard
          testID="home-card-calendar"
          title={t("navigation.calendar")}
          onPress={() => {
            count("calendar");
            openCalendar();
          }}
          className="mt-4"
        >
          <PaceHeadline
            pace={pace?.choresDone}
            today={pace?.today}
            fadeIn={startedEmpty}
            format={String}
            unit={(chores) => t("home.choresDone", { count: chores })}
          />
          <WeekStrip days={days} today={today} />
          {nextEvent && (
            <View className="mt-4 flex-row items-center gap-2">
              <View
                className={cn(
                  "h-2 w-2 rounded-full",
                  categoryFillColorMap[nextEvent.item.color],
                )}
              />
              <Text
                numberOfLines={1}
                className="text-foreground flex-1 text-sm font-semibold"
              >
                {nextEvent.item.title}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {describeNextEvent(nextEvent, t, locale)}
              </Text>
            </View>
          )}
        </HomeCard>

        <HomeCard
          testID="home-card-pinboard"
          title={t("pinboard.title")}
          onPress={() => {
            count("pinboard");
            router.navigate("/(tabs)/home/pinboard");
          }}
          className="mt-4"
        >
          <Text className="text-foreground mt-2 text-base">
            {t("pinboard.homeHint")}
          </Text>
        </HomeCard>
      </AppScrollView>
    </View>
  );
}
