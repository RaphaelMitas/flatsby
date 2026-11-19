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

import {
  deviceTimeZone,
  formatCalendarDate,
  localDate,
} from "@flatsby/validators/calendar";
import {
  expenseCategoryGroupColorKeys,
  groupIconSubcategory,
} from "@flatsby/validators/expenses/categories";
import { categoryFillColorMap } from "@flatsby/validators/expenses/category-colors";
import { formatCurrencyFromCents } from "@flatsby/validators/expenses/formatting";
import {
  statisticsMonth,
  statisticsRanges,
} from "@flatsby/validators/statistics";

import { getExpenseCategoryData } from "~/components/expenses/ExpenseCategoryConfig";
import { GroupGate } from "~/components/GroupGate";
import {
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
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useRefetchStaleOnFocus } from "~/utils/useRefetchStaleOnFocus";
import { MonthBars } from "./MonthBars";
import { SplitBar } from "./SplitBar";

const SPENDING_BARS_HEIGHT = 100;
const COUNT_BARS_HEIGHT = 50;

export function StatisticsScreen() {
  return (
    <GroupGate>
      {(group) => <GroupStatistics key={group.id} group={group} />}
    </GroupGate>
  );
}

const bold = (chunks: ReactNode) => (
  <Text className="text-foreground font-semibold">{chunks}</Text>
);

const isEmpty = ({ spending, shopping, chores }: Statistics) =>
  [
    ...spending.months.flatMap(({ share, household }) => [share, household]),
    ...shopping.months.map(({ total }) => total),
    ...chores.months.map(({ total }) => total),
  ].every((value) => value === 0);

function GroupStatistics({ group }: { group: GroupWithAccess }) {
  const t = useTranslations();
  const locale = useLocale();
  const [range, setRange] = useState<StatisticsRange>("thisMonth");
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
  const month = statisticsMonth(range, localDate());
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
          items={statisticsRanges.map((id) => ({
            id,
            title: t(`statistics.ranges.${id}`),
          }))}
          selectedId={range}
          onSelect={({ id }) => {
            const picked = statisticsRanges.find((option) => option === id);
            if (picked) setRange(picked);
          }}
          trigger={
            <View className="mt-4 flex-row items-center gap-2">
              <Text className="text-foreground text-4xl font-extrabold tracking-tight">
                {month
                  ? formatCalendarDate(`${month}-01`, locale, { month: "long" })
                  : t(`statistics.ranges.${range}`)}
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
              variant="primary"
              size="lg"
            />
          </View>
        ) : data && isEmpty(data) ? (
          <View className="mt-16 items-center gap-2 px-4">
            <Text className="text-foreground text-center text-lg font-semibold">
              {t("statistics.empty.title")}
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              {t("statistics.empty.description")}
            </Text>
          </View>
        ) : (
          <>
            <Hero data={data} showsPace={month !== null} money={money} />
            {data && data.spending.categories.length > 0 && (
              <WhereItWent data={data} money={money} />
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
                format={(cents) =>
                  Math.round(cents / 100).toLocaleString(locale)
                }
              />
            </HomeCard>
            <CountCard
              title={t("navigation.shopping")}
              counts={data?.shopping}
              data={data}
              unit={(count) => t("home.itemsBought", { count })}
            >
              {data && (
                <ShoppingDetails
                  categories={data.shopping.categories}
                  daysOnList={data.shopping.daysOnList}
                />
              )}
            </CountCard>
            <CountCard
              title={t("statistics.chores")}
              counts={data?.chores}
              data={data}
              unit={(count) => t("home.choresDone", { count })}
            >
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
          </>
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

  if (!data)
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
        </View>
        {showsPace && (
          <PaceChart
            pace={undefined}
            today={undefined}
            height={80}
            labelled
            drawIn={false}
          />
        )}
      </View>
    );

  const { pace, share, household } = data.spending;

  return (
    <View className="mt-8">
      <Text className="text-muted-foreground text-sm font-semibold">
        {t("statistics.yourShare")}
      </Text>
      <Text
        testID="statistics-share"
        className="text-foreground mt-1 text-5xl font-extrabold tracking-tight"
      >
        {money(share)}
      </Text>
      <Text className="text-muted-foreground mt-2 text-base">
        {t.rich("statistics.ofHousehold", {
          amount: money(household),
          b: bold,
        })}
        {pace && (
          <>
            {" "}
            <Comparison pace={pace} data={data} format={money} />
          </>
        )}
      </Text>
      {pace && (
        <PaceChart
          pace={pace}
          today={data.to}
          height={80}
          labelled
          drawIn={false}
        />
      )}
    </View>
  );
}

function Comparison({
  pace,
  data,
  format,
  className,
}: {
  pace: Pace;
  data: Statistics;
  format: (value: number) => string;
  className?: string;
}) {
  return (
    <PaceComparison
      pace={pace}
      today={data.to}
      format={format}
      wholeMonth={data.to !== data.today}
      className={className}
    />
  );
}

function WhereItWent({
  data,
  money,
}: {
  data: Statistics;
  money: (cents: number) => string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const { categories } = data.spending;

  return (
    <HomeCard title={t("statistics.whereItWent")} className="mt-6">
      <SplitBar
        segments={categories.map(({ category, share }) => ({
          key: category,
          value: share,
          fill: categoryFillColorMap[expenseCategoryGroupColorKeys[category]],
        }))}
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
            onPress={() =>
              router.navigate({
                pathname: "/(tabs)/expenses",
                params: { category, from: data.from, to: data.to },
              })
            }
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
  data,
  unit,
  children,
}: {
  title: string;
  counts:
    | {
        total: number;
        pace: Pace | null;
        months: { month: string; total: number }[];
      }
    | undefined;
  data: Statistics | undefined;
  unit: (count: number) => string;
  children: ReactNode;
}) {
  return (
    <HomeCard title={title} className="mt-4">
      {counts && data ? (
        <View className="mt-2">
          <Headline value={counts.total} format={String} unit={unit} />
          {counts.pace && (
            <Comparison
              pace={counts.pace}
              data={data}
              format={String}
              className="text-muted-foreground text-sm"
            />
          )}
        </View>
      ) : (
        <HeadlineSkeleton />
      )}
      <MonthBars
        bars={counts?.months}
        height={COUNT_BARS_HEIGHT}
        format={String}
      />
      {children}
    </HomeCard>
  );
}

function ShoppingDetails({
  categories,
  daysOnList,
}: Pick<Statistics["shopping"], "categories" | "daysOnList">) {
  const t = useTranslations();
  const shown = categories.map(({ category, total }) => {
    const { colorKey, name } = getCategoryData({ categoryId: category });
    return { category, total, name, fill: categoryFillColorMap[colorKey] };
  });

  return (
    <>
      {shown.length > 0 && (
        <>
          <SplitBar
            segments={shown.map(({ category, total, fill }) => ({
              key: category,
              value: total,
              fill,
            }))}
          />
          <View className="mt-2.5 flex-row flex-wrap gap-x-3 gap-y-1">
            {shown.map(({ category, total, name, fill }) => (
              <LegendKey
                key={category}
                fill={fill}
                label={t(name)}
                count={total}
              />
            ))}
          </View>
        </>
      )}
      {daysOnList !== null && (
        <View className="mt-4 flex-row items-center gap-3">
          <View className="bg-muted size-9 items-center justify-center rounded-full">
            <Icon name="timer" size={16} color="foreground" />
          </View>
          <Text className="text-muted-foreground flex-1 text-sm">
            {t.rich("statistics.daysOnList", { count: daysOnList, b: bold })}
          </Text>
        </View>
      )}
    </>
  );
}
