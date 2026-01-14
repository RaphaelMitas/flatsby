import { useEffect } from "react";
import { Redirect } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { Tabs } from "~/lib/components/bottom-tabs";
import { useWinterEffects } from "~/lib/ui/winter-effects";
import { useThemeColors } from "~/lib/utils";
import { prefetch, trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

const houseIcon = LucideIcon.getImageSourceSync("house", 20);
const shoppingBasketIcon = LucideIcon.getImageSourceSync("shopping-basket", 20);
const walletIcon = LucideIcon.getImageSourceSync("wallet", 20);
const settingsIcon = LucideIcon.getImageSourceSync("settings", 20);
const messageSquareIcon = LucideIcon.getImageSourceSync("message-square", 20);

//winter themed icons
const winterHomeIcon = LucideIcon.getImageSourceSync("snowflake", 20);
const winterCartIcon = LucideIcon.getImageSourceSync("gift", 20);

export default function TabLayout() {
  const session = useSession();
  const { selectedGroupId, selectedShoppingListId, selectedShoppingListName } =
    useShoppingStore();
  const { getColor } = useThemeColors();
  const { isEnabled: isWinterEffectsEnabled } = useWinterEffects();

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
        trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
          groupId: selectedGroupId,
          shoppingListId: selectedShoppingListId,
          limit: 20,
        }),
      );
    }

    if (selectedGroupId) {
      void prefetch(
        trpc.shoppingList.getShoppingLists.queryOptions({
          groupId: selectedGroupId,
        }),
      );
      void prefetch(
        trpc.expense.getGroupExpenses.infiniteQueryOptions({
          groupId: selectedGroupId,
          limit: 20,
        }),
      );
    }

    void prefetch(trpc.group.getUserGroups.queryOptions());
  }, [selectedGroupId, selectedShoppingListId, session.data?.user]);

  if (!session.data?.user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: getColor("primary"),
      }}
      tabBarStyle={{
        backgroundColor: getColor("background"),
      }}
      activeIndicatorColor={getColor("muted")}
      rippleColor={getColor("primary")}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon:
            isWinterEffectsEnabled && winterHomeIcon
              ? () => winterHomeIcon
              : houseIcon
                ? () => houseIcon
                : undefined,
        }}
      />
      <Tabs.Screen
        name="shoppingList"
        options={{
          title: selectedShoppingListName ?? "Shopping List",
          tabBarIcon:
            isWinterEffectsEnabled && winterCartIcon
              ? () => winterCartIcon
              : shoppingBasketIcon
                ? () => shoppingBasketIcon
                : undefined,
          tabBarItemHidden: !selectedShoppingListId,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: walletIcon ? () => walletIcon : undefined,
          tabBarItemHidden: !selectedGroupId,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: messageSquareIcon ? () => messageSquareIcon : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: settingsIcon ? () => settingsIcon : undefined,
        }}
      />
    </Tabs>
  );
}
