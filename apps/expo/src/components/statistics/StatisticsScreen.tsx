import type { GroupWithAccess } from "@flatsby/api";
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
import {
  formatCurrencyFromCents,
  formatWholeAmountFromCents,
} from "@flatsby/validators/expenses/formatting";
import {
  isStatisticsEmpty,
  statisticsMonth,
  statisticsRanges,
} from "@flatsby/validators/statistics";

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
const PLACEHOLDER_ROWS = [0, 1, 2, 3];

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
  const stale = query.isPlaceholderData;
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
            <Hero data={data} showsPace={month !== null} money={money} />
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
              />
            </HomeCard>
            <CountCard
              title={t("navigation.shopping")}
              counts={data?.shopping}
              to={data?.to}
              wholeMonth={data?.wholeMonth}
              unit={(count) => t("home.itemsBought", { count })}
            >
              {data ? (
                <ShoppingDetails
                  categories={data.shopping.categories}
                  daysOnList={data.shopping.daysOnList}
                />
              ) : (
                <>
                  <Skeleton className="bg-foreground/10 mt-4 h-3 rounded-md" />
                  <View className="mt-2.5">
                    <TextSkeleton className="text-xs" size="xs" width="3xl" />
                  </View>
                </>
              )}
            </CountCard>
            <CountCard
              title={t("statistics.chores")}
              counts={data?.chores}
              to={data?.to}
              wholeMonth={data?.wholeMonth}
              unit={(count) => t("home.choresDone", { count })}
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
  const pace = data?.spending.pace ?? undefined;

  return (
    <View className="mt-8">
      <Text className="text-muted-foreground text-sm font-semibold">
        {t("statistics.yourShare")}
      </Text>
      <View className="mt-1">
        {data ? (
          <Text
            testID="statistics-share"
            className="text-foreground text-5xl font-extrabold tracking-tight"
          >
            {money(data.spending.share)}
          </Text>
        ) : (
          <TextSkeleton
            className="text-5xl font-extrabold"
            size="3xl"
            width="xl"
          />
        )}
      </View>
      <View className="mt-2">
        {data ? (
          <Text className="text-muted-foreground text-base">
            {t.rich("statistics.ofHousehold", {
              amount: money(data.spending.household),
              b: bold,
            })}
          </Text>
        ) : (
          <TextSkeleton className="text-base" size="sm" width="3xl" />
        )}
        {showsPace &&
          (data && pace ? (
            <PaceComparison
              pace={pace}
              today={data.to}
              format={money}
              wholeMonth={data.wholeMonth}
              className="text-muted-foreground text-base"
            />
          ) : (
            <TextSkeleton className="text-base" size="sm" width="2xl" />
          ))}
      </View>
      {showsPace && (
        <PaceChart
          pace={pace}
          today={data?.to}
          height={80}
          labelled
          wholeMonth={data?.wholeMonth}
          drawIn={false}
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
            disabled={disabled}
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
  to,
  wholeMonth,
  unit,
  children,
}: {
  title: string;
  counts: Pick<Statistics["shopping"], "total" | "pace" | "months"> | undefined;
  to: string | undefined;
  wholeMonth: boolean | undefined;
  unit: (count: number) => string;
  children: ReactNode;
}) {
  return (
    <HomeCard title={title} className="mt-4">
      {counts && to ? (
        <View className="mt-2">
          <Headline value={counts.total} format={String} unit={unit} />
          {counts.pace && (
            <PaceComparison
              pace={counts.pace}
              today={to}
              format={String}
              wholeMonth={wholeMonth}
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
