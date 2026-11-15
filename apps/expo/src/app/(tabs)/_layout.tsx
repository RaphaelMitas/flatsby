import { useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import LucideIcon from "@react-native-vector-icons/lucide";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { listWindow, localDate } from "@flatsby/validators/calendar";
import { OnMount } from "@flatsby/validators/OnMount";
import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { calendarRangeOptions } from "~/components/calendar/calendarRangeOptions";
import { shoppingListItemsOptions } from "~/components/shoppingList/ShoppingListUtils";
import { useThemeColors } from "~/lib/utils";
import { prefetch, trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useEveningReminders } from "~/utils/evening-reminders";
import { useShoppingStore } from "~/utils/shopping-store";

const houseIcon = LucideIcon.getImageSourceSync("house", 20);
const shoppingBasketIcon = LucideIcon.getImageSourceSync("shopping-basket", 20);
const walletIcon = LucideIcon.getImageSourceSync("wallet", 20);
const calendarIcon = LucideIcon.getImageSourceSync("calendar", 20);
const settingsIcon = LucideIcon.getImageSourceSync("settings", 20);

function prefetchSelection(groupId: number, shoppingListId: number | null) {
  if (shoppingListId) {
    void prefetch(
      trpc.shoppingList.getShoppingList.queryOptions({
        groupId,
        shoppingListId,
      }),
    );
    void prefetch(shoppingListItemsOptions(groupId, shoppingListId));
  }
  void prefetch(trpc.shoppingList.getShoppingLists.queryOptions({ groupId }));
  void prefetch(
    trpc.expense.getGroupExpenses.infiniteQueryOptions(
      { groupId, limit: PAGE_SIZE.expenses },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );
  void prefetch(
    calendarRangeOptions(groupId, listWindow(localDate(), localDate())),
  );
}

export default function TabLayout() {
  const session = useSession();
  const { selectedGroupId, selectedShoppingListId, selectedShoppingListName } =
    useShoppingStore();
  const { getColor } = useThemeColors();
  const t = useTranslations("navigation");

  useEveningReminders();
  const groups = useQuery({
    ...trpc.group.getUserGroups.queryOptions(),
    enabled: !!session.data?.user,
  });
  const deletingGroup =
    useIsMutating({ mutationKey: trpc.group.deleteGroup.mutationKey() }) > 0;
  const [tabsShown, setTabsShown] = useState(false);

  if (!session.data?.user) {
    return <Redirect href="/auth/login" />;
  }
  const prefetcher = selectedGroupId ? (
    <OnMount
      key={`${session.data.user.id}:${selectedGroupId}:${selectedShoppingListId}`}
      run={() => prefetchSelection(selectedGroupId, selectedShoppingListId)}
    />
  ) : null;
  const noGroups =
    groups.data?.success && groups.data.data.length === 0 && !deletingGroup;
  if (
    !tabsShown &&
    (groups.isLoading ||
      (noGroups && groups.isFetching && !groups.isFetchedAfterMount))
  ) {
    return (
      <>
        {prefetcher}
        <View className="bg-background flex-1" />
      </>
    );
  }
  if (noGroups) {
    return <Redirect href="/welcome" />;
  }
  if (!tabsShown) setTabsShown(true);

  return (
    <>
      {prefetcher}
      <NativeTabs
        tintColor={getColor("primary")}
        backgroundColor={getColor("background")}
        indicatorColor={getColor("muted")}
        rippleColor={getColor("primary")}
      >
        <NativeTabs.Trigger name="home" testID="tab-home">
          <NativeTabs.Trigger.Label>{t("home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={houseIcon} renderingMode="template" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="shoppingList"
          testID="tab-shopping-list"
          hidden={!selectedGroupId}
        >
          <NativeTabs.Trigger.Label>
            {selectedShoppingListName ?? t("shopping")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={shoppingBasketIcon}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="expenses"
          testID="tab-expenses"
          hidden={!selectedGroupId}
        >
          <NativeTabs.Trigger.Label>{t("expenses")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={walletIcon} renderingMode="template" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="calendar"
          testID="tab-calendar"
          hidden={!selectedGroupId}
        >
          <NativeTabs.Trigger.Label>{t("calendar")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={calendarIcon}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings" testID="tab-settings">
          <NativeTabs.Trigger.Label>{t("settings")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={settingsIcon}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
