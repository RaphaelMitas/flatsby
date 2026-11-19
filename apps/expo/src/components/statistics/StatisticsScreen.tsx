import type { GroupWithAccess } from "@flatsby/api";
import type { Pace } from "@flatsby/validators/home";
import type {
  Statistics,
  StatisticsRange,
} from "@flatsby/validators/statistics";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";

import { useCountUp } from "@flatsby/api/hooks/useCountUp";
import {
  deviceTimeZone,
  formatCalendarDate,
  localDate,
  monthOf,
} from "@flatsby/validators/calendar";
import {
  expenseCategoryGroupColorKeys,
  groupIconSubcategory,
} from "@flatsby/validators/expenses/categories";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";
import {
  formatCurrencyFromCents,
  formatWholeAmountFromCents,
} from "@flatsby/validators/expenses/formatting";
import { sum } from "@flatsby/validators/home";
import {
  isStatisticsEmpty,
  presetOf,
  statisticsChoices,
} from "@flatsby/validators/statistics";

import type { MonthPicker } from "./MonthBars";
import type { PacePoint } from "~/components/home/PaceChart";
import { getExpenseCategoryData } from "~/components/expenses/ExpenseCategoryConfig";
import { GroupGate } from "~/components/GroupGate";
import {
  bold,
  Headline,
  HeadlineSkeleton,
  HomeCard,
  PaceComparison,
  TextSkeleton,
} from "~/components/home/HomeCard";
import { PaceChart } from "~/components/home/PaceChart";
import { getCategoryData } from "~/components/shoppingList/ShoppingListCategory";
import { AppScrollView } from "~/lib/components/keyboard-aware-scroll-view";
import {
  BottomSheetPickerProvider,
  BottomSheetPickerTrigger,
} from "~/lib/ui/bottom-sheet-picker";
import { Button } from "~/lib/ui/button";
import Icon from "~/lib/ui/custom/icons/Icon";
import { Skeleton } from "~/lib/ui/skeleton";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useRefetchStaleOnFocus } from "~/utils/useRefetchStaleOnFocus";
import { MonthBars } from "./MonthBars";
import { SplitBar } from "./SplitBar";

const SPENDING_BARS_HEIGHT = 100;
const COUNT_BARS_HEIGHT = 50;
const HERO_PACE_HEIGHT = 80;
const PLACEHOLDER_ROWS = [0, 1, 2, 3];

interface MonthCount {
  month: string;
  total: number;
}

interface Only {
  label: string;
  fill: string;
  of: string;
}

export function StatisticsScreen() {
  return (
    <GroupGate>
      {(group) => <GroupStatistics key={group.id} group={group} />}
    </GroupGate>
  );
}

function GroupStatistics({ group }: { group: GroupWithAccess }) {
  const t = useTranslations();
  const locale = useLocale();
  const today = localDate();
  const [chosen, setChosen] = useState<StatisticsRange>();
  const range = chosen ?? monthOf(today);
  const query = useQuery({
    ...trpc.stats.getStatistics.queryOptions({
      groupId: group.id,
      range,
      timeZone: deviceTimeZone(),
    }),
    placeholderData: keepPreviousData,
  });
  useRefetchStaleOnFocus(trpc.stats.getStatistics.pathFilter());

  const data = query.data?.success ? query.data.data : undefined;
  const failed = !data && (query.isError || query.data?.success === false);
  const stale = query.isPlaceholderData;
  const preset = presetOf(range);
  const picker = data && { range, period: data, onPick: setChosen };
  const money = (cents: number) =>
    formatCurrencyFromCents({ cents, currency: group.currency, locale });

  return (
    <BottomSheetPickerProvider>
      <AppScrollView
        contentContainerClassName="px-5 pb-32"
        onRefresh={() => query.refetch()}
      >
        <BottomSheetPickerTrigger
          testID="statistics-range"
          title={t("statistics.ranges.title")}
          items={statisticsChoices(today).map(({ key, range: option }) => ({
            id: option,
            title: t(`statistics.ranges.${key}`),
          }))}
          selectedId={range}
          onSelect={({ id }) => setChosen(id)}
          trigger={
            <View className="mt-4 flex-row items-center gap-2">
              <Text className="text-foreground text-4xl font-extrabold tracking-tight">
                {preset
                  ? t(`statistics.ranges.${preset}`)
                  : formatCalendarDate(`${range}-01`, locale, {
                      month: "long",
                    })}
              </Text>
              <Icon name="chevron-down" size={22} color="muted-foreground" />
            </View>
          }
        />
        <Text className="text-muted-foreground mt-1 text-base">
          {group.name}
        </Text>

        {failed ? (
          <View className="mt-16 items-center gap-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("home.somethingWentWrong")}
            </Text>
            <Button
              title={t("home.retry")}
              onPress={() => void query.refetch()}
              disabled={query.isFetching}
              variant="primary"
              size="lg"
            />
          </View>
        ) : data && isStatisticsEmpty(data) ? (
          <View className="mt-16 items-center gap-2 px-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("statistics.empty.title")}
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {t("statistics.empty.description")}
            </Text>
          </View>
        ) : (
          <View className={cn(stale && "opacity-50")}>
            <Hero data={data} showsPace={!preset} money={money} />
            {(!data || data.spending.categories.length > 0) && (
              <WhereItWent data={data} money={money} disabled={stale} />
            )}
            <HomeCard
              title={t("statistics.monthByMonth")}
              accessory={<MonthLegend />}
              className="mt-4"
            >
              <MonthBars
                bars={data?.spending.months.map(
                  ({ month: shown, share, household }) => ({
                    month: shown,
                    total: household,
                    filled: share,
                  }),
                )}
                height={SPENDING_BARS_HEIGHT}
                format={(cents) => formatWholeAmountFromCents(cents, locale)}
                picker={picker}
                barTestID="statistics-spending"
              />
            </HomeCard>
            <ShoppingCard data={data} picker={picker} />
            <CountCard
              title={t("statistics.chores")}
              counts={data?.chores}
              to={data?.to}
              wholeMonth={data?.wholeMonth}
              unit={(count) => t("home.choresDone", { count })}
              picker={picker}
              barTestID="statistics-chores"
            >
              {!data &&
                PLACEHOLDER_ROWS.map((row) => (
                  <View key={row} className="mt-3">
                    <TextSkeleton
                      className="text-base font-semibold"
                      size="sm"
                      width="2xl"
                    />
                  </View>
                ))}
              {data?.chores.titles.map(({ title, color, total }) => (
                <View
                  key={title}
                  className="mt-3 flex-row items-center gap-2.5"
                >
                  <View
                    className={cn(
                      "h-2 w-2 rounded-full",
                      categoryFillColorMap[color],
                    )}
                  />
                  <Text
                    numberOfLines={1}
                    className="text-foreground flex-1 text-base font-semibold"
                  >
                    {title}
                  </Text>
                  <Text className="text-muted-foreground text-base">
                    {t("statistics.times", { count: total })}
                  </Text>
                </View>
              ))}
            </CountCard>
          </View>
        )}
      </AppScrollView>
    </BottomSheetPickerProvider>
  );
}

function Hero({
  data,
  showsPace,
  money,
}: {
  data: Statistics | undefined;
  showsPace: boolean;
  money: (cents: number) => string;
}) {
  const t = useTranslations();

  if (data)
    return <ShareHero data={data} showsPace={showsPace} money={money} />;

  return (
    <View className="mt-8">
      <Text className="text-muted-foreground text-sm font-semibold">
        {t("statistics.yourShare")}
      </Text>
      <View className="mt-1">
        <TextSkeleton
          className="text-5xl font-extrabold"
          size="3xl"
          width="xl"
        />
      </View>
      <View className="mt-2">
        <TextSkeleton className="text-base" size="sm" width="3xl" />
        {showsPace && (
          <TextSkeleton className="text-base" size="sm" width="2xl" />
        )}
      </View>
      {showsPace && (
        <PaceChart
          pace={undefined}
          today={undefined}
          height={HERO_PACE_HEIGHT}
          labelled
          drawIn={false}
        />
      )}
    </View>
  );
}

function ShareHero({
  data: { spending, to, wholeMonth },
  showsPace,
  money,
}: {
  data: Statistics;
  showsPace: boolean;
  money: (cents: number) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [point, setPoint] = useState<PacePoint | null>(null);
  const share = useCountUp(spending.share);
  const { pace } = spending;
  const now = point?.now;
  const before = point?.before;
  const date = (day: string) =>
    formatCalendarDate(day, locale, { day: "numeric", month: "short" });

  return (
    <View className="mt-8">
      <Text className="text-muted-foreground text-sm font-semibold">
        {now
          ? t("statistics.yourShareBy", { date: date(now.date) })
          : t("statistics.yourShare")}
      </Text>
      <Text
        testID="statistics-share"
        className="text-foreground mt-1 text-5xl font-extrabold tracking-tight"
      >
        {money(now ? now.total : share)}
      </Text>
      <View className="mt-2">
        <Text className="text-muted-foreground text-base">
          {t.rich("statistics.ofHousehold", {
            amount: money(
              pace && point?.now
                ? sum(pace.household.slice(0, point.index + 1))
                : spending.household,
            ),
            b: bold,
          })}
        </Text>
        {showsPace &&
          (!pace ? (
            <TextSkeleton className="text-base" size="sm" width="2xl" />
          ) : !before ? (
            <PaceComparison
              pace={pace}
              today={to}
              format={money}
              wholeMonth={wholeMonth}
              className="text-muted-foreground text-base"
            />
          ) : (
            <Text className="text-muted-foreground text-base">
              {now
                ? t.rich(
                    `statistics.byDay.${now.total < before.total ? "less" : now.total > before.total ? "more" : "same"}`,
                    {
                      amount: money(Math.abs(now.total - before.total)),
                      date: date(before.date),
                      b: bold,
                    },
                  )
                : t.rich("statistics.byDay.before", {
                    amount: money(before.total),
                    date: date(before.date),
                    b: bold,
                  })}
            </Text>
          ))}
      </View>
      {showsPace && (
        <PaceChart
          pace={pace ?? undefined}
          today={to}
          height={HERO_PACE_HEIGHT}
          labelled
          wholeMonth={wholeMonth}
          drawIn={false}
          onScrub={setPoint}
        />
      )}
    </View>
  );
}

function WhereItWent({
  data,
  money,
  disabled,
}: {
  data: Statistics | undefined;
  money: (cents: number) => string;
  disabled: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();

  if (!data)
    return (
      <HomeCard title={t("statistics.whereItWent")} className="mt-6">
        <Skeleton className="bg-foreground/10 mt-4 h-3 rounded-md" />
        {PLACEHOLDER_ROWS.map((row) => (
          <View key={row} className="mt-3.5 flex-row items-center gap-3">
            <Skeleton className="bg-foreground/10 size-9 rounded-full" />
            <View className="flex-1">
              <TextSkeleton
                className="text-base font-semibold"
                size="sm"
                width="md"
              />
              <TextSkeleton className="text-sm" size="xs" width="lg" />
            </View>
          </View>
        ))}
      </HomeCard>
    );

  const { categories } = data.spending;
  const open = (category: string) =>
    router.navigate({
      pathname: "/(tabs)/expenses",
      params: { category, from: data.from, to: data.to },
    });

  return (
    <HomeCard title={t("statistics.whereItWent")} className="mt-6">
      <SplitBar
        segments={categories.map(({ category, share }) => ({
          key: category,
          value: share,
          label: t(`expenseCategories.groups.${category}`),
          fill: categoryFillColorMap[expenseCategoryGroupColorKeys[category]],
        }))}
        disabled={disabled}
        onPick={open}
      />
      {categories.map(({ category, share, household }) => {
        const { bgColor, icon } = getExpenseCategoryData({
          subcategoryId: groupIconSubcategory(category),
        });
        return (
          <Pressable
            key={category}
            testID={`statistics-category-${category}`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => open(category)}
            className="mt-3.5 flex-row items-center gap-3 active:opacity-70"
          >
            <View
              className={cn(
                "size-9 items-center justify-center rounded-full",
                bgColor,
              )}
            >
              {icon}
            </View>
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="text-foreground text-base font-semibold"
              >
                {t(`expenseCategories.groups.${category}`)}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {t("statistics.householdAmount", { amount: money(household) })}
              </Text>
            </View>
            <Text className="text-foreground text-base font-semibold">
              {money(share)}
            </Text>
            <Icon name="chevron-right" size={16} color="muted-foreground" />
          </Pressable>
        );
      })}
    </HomeCard>
  );
}

function MonthLegend() {
  const t = useTranslations();
  return (
    <View className="flex-row gap-3">
      <LegendKey fill="bg-foreground" label={t("statistics.you")} />
      <LegendKey fill="bg-border" label={t("statistics.household")} />
    </View>
  );
}

function LegendKey({
  fill,
  label,
  count,
}: {
  fill: string;
  label: string;
  count?: number;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn("size-2.5 rounded-sm", fill)} />
      <Text className="text-muted-foreground text-xs font-medium">
        {label}
        {count !== undefined && bold(` ${count}`)}
      </Text>
    </View>
  );
}

function CountCard({
  title,
  counts,
  to,
  wholeMonth,
  unit,
  only,
  picker,
  barTestID,
  children,
}: {
  title: string;
  counts:
    { total: number; pace: Pace | null; months: MonthCount[] } | undefined;
  to: string | undefined;
  wholeMonth: boolean | undefined;
  unit: (count: number) => string;
  only?: Only;
  picker: MonthPicker | undefined;
  barTestID: string;
  children: ReactNode;
}) {
  return (
    <HomeCard title={title} className="mt-4">
      {counts && to ? (
        <CountHeadline
          total={counts.total}
          pace={counts.pace}
          to={to}
          wholeMonth={wholeMonth}
          unit={unit}
          only={only}
        />
      ) : (
        <HeadlineSkeleton />
      )}
      <MonthBars
        bars={counts?.months}
        height={COUNT_BARS_HEIGHT}
        format={String}
        picker={picker}
        tint={only?.fill}
        barTestID={barTestID}
      />
      {children}
    </HomeCard>
  );
}

function CountHeadline({
  total,
  pace,
  to,
  wholeMonth,
  unit,
  only,
}: {
  total: number;
  pace: Pace | null;
  to: string;
  wholeMonth: boolean | undefined;
  unit: (count: number) => string;
  only: Only | undefined;
}) {
  return (
    <View className="mt-2">
      <Headline
        value={useCountUp(total)}
        format={String}
        unit={() => (only ? `× ${only.label}` : unit(total))}
      />
      {pace &&
        (only ? (
          <Text className="text-muted-foreground text-sm">{only.of}</Text>
        ) : (
          <PaceComparison
            pace={pace}
            today={to}
            format={String}
            wholeMonth={wholeMonth}
            className="text-muted-foreground text-sm"
          />
        ))}
    </View>
  );
}

function ShoppingCard({
  data,
  picker,
}: {
  data: Statistics | undefined;
  picker: MonthPicker | undefined;
}) {
  const t = useTranslations();
  const [picked, setPicked] = useState<string | null>(null);
  const shopping = data?.shopping;
  const shown = (shopping?.categories ?? []).map(({ category, total }) => {
    const { colorKey, name } = getCategoryData({ categoryId: category });
    return {
      category,
      total,
      label: t(name),
      fill: categoryFillColorMap[colorKey],
    };
  });
  const filtered = shown.find(({ category }) => category === picked);
  const toggle = (category: string) =>
    setPicked(picked === category ? null : category);

  return (
    <CountCard
      title={t("navigation.shopping")}
      counts={
        shopping && {
          total: filtered?.total ?? shopping.total,
          pace: shopping.pace,
          months: shopping.months.map(({ month, total, categories }) => ({
            month,
            total: filtered ? (categories[filtered.category] ?? 0) : total,
          })),
        }
      }
      to={data?.to}
      wholeMonth={data?.wholeMonth}
      unit={(count) => t("home.itemsBought", { count })}
      only={
        shopping &&
        filtered && {
          label: filtered.label,
          fill: filtered.fill,
          of: t("statistics.ofItemsBought", { count: shopping.total }),
        }
      }
      picker={picker}
      barTestID="statistics-shopping"
    >
      {shopping ? (
        <>
          {shown.length > 0 && (
            <>
              <SplitBar
                segments={shown.map(({ category, total, label, fill }) => ({
                  key: category,
                  value: total,
                  label,
                  fill,
                }))}
                lit={filtered?.category}
                onPick={toggle}
              />
              <View className="mt-1.5 flex-row flex-wrap gap-x-3">
                {shown.map(({ category, total, label, fill }) => (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: filtered?.category === category,
                    }}
                    onPress={() => toggle(category)}
                    className={cn(
                      "py-1",
                      filtered &&
                        filtered.category !== category &&
                        "opacity-40",
                    )}
                  >
                    <LegendKey fill={fill} label={label} count={total} />
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {shopping.daysOnList !== null && (
            <View className="mt-4 flex-row items-center gap-3">
              <View className="bg-muted size-9 items-center justify-center rounded-full">
                <Icon name="timer" size={16} color="foreground" />
              </View>
              <Text className="text-muted-foreground flex-1 text-sm">
                {t.rich("statistics.daysOnList", {
                  count: shopping.daysOnList,
                  b: bold,
                })}
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <Skeleton className="bg-foreground/10 mt-4 h-3 rounded-md" />
          <View className="mt-2.5">
            <TextSkeleton className="text-xs" size="xs" width="3xl" />
          </View>
        </>
      )}
    </CountCard>
  );
}
