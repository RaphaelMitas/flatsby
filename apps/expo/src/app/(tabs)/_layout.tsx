import { useEffect } from "react";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import LucideIcon from "@react-native-vector-icons/lucide";

import { PAGE_SIZE } from "@flatsby/validators/pagination";

import { useThemeColors } from "~/lib/utils";
import { usePostHogIdentify } from "~/utils/analytics/use-posthog-identify";
import { prefetch, trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

const houseIcon = LucideIcon.getImageSourceSync("house", 20);
const shoppingBasketIcon = LucideIcon.getImageSourceSync("shopping-basket", 20);
const walletIcon = LucideIcon.getImageSourceSync("wallet", 20);
const settingsIcon = LucideIcon.getImageSourceSync("settings", 20);

export default function TabLayout() {
  const session = useSession();
  const { selectedGroupId, selectedShoppingListId, selectedShoppingListName } =
    useShoppingStore();
  const { getColor } = useThemeColors();

  usePostHogIdentify();

  useEffect(() => {
    if (!session.data?.user) {
      return;
    }

    if (selectedShoppingListId && selectedGroupId) {
      void prefetch(
        trpc.shoppingList.getShoppingList.queryOptions({
          groupId: selectedGroupId,
          shoppingListId: selectedShoppingListId,
        }),
      );
      void prefetch(
        trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
          {
            groupId: selectedGroupId,
            shoppingListId: selectedShoppingListId,
            limit: PAGE_SIZE.shoppingListItems,
          },
          {
            getNextPageParam: (lastPage) =>
              lastPage.success === true ? lastPage.data.nextCursor : null,
          },
        ),
      );
    }

    if (selectedGroupId) {
      void prefetch(
        trpc.shoppingList.getShoppingLists.queryOptions({
          groupId: selectedGroupId,
        }),
      );
      void prefetch(
        trpc.expense.getGroupExpenses.infiniteQueryOptions(
          {
            groupId: selectedGroupId,
            limit: PAGE_SIZE.expenses,
          },
          {
            getNextPageParam: (lastPage) =>
              lastPage.success === true ? lastPage.data.nextCursor : null,
          },
        ),
      );
    }

    void prefetch(trpc.group.getUserGroups.queryOptions());
  }, [selectedGroupId, selectedShoppingListId, session.data?.user]);

  // Guarding per screen segfaults in UIKit: signing out from Settings
  // redirected from the backgrounded home tab, tearing down one tab's
  // navigation stack while another was still mounted.
  if (!session.isPending && !session.data?.user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <NativeTabs
      tintColor={getColor("primary")}
      backgroundColor={getColor("background")}
      indicatorColor={getColor("muted")}
      rippleColor={getColor("primary")}
    >
      <NativeTabs.Trigger name="home" testID="tab-home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={houseIcon} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="shoppingList"
        testID="tab-shopping-list"
        hidden={!selectedShoppingListId}
      >
        <NativeTabs.Trigger.Label>
          {selectedShoppingListName ?? "Shopping List"}
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
        <NativeTabs.Trigger.Label>Expenses</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={walletIcon} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" testID="tab-settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={settingsIcon} renderingMode="template" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
