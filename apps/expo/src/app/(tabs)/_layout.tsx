import { useEffect } from "react";
import { Redirect } from "expo-router";
import LucideIcon from "@react-native-vector-icons/lucide";

import { Tabs } from "~/lib/components/bottom-tabs";
import { useThemeColors } from "~/lib/utils";
import { prefetch, trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

const houseIcon = LucideIcon.getImageSourceSync("house", 20);
const usersIcon = LucideIcon.getImageSourceSync("users", 20);
const cartIcon = LucideIcon.getImageSourceSync("shopping-cart", 20);
const settingsIcon = LucideIcon.getImageSourceSync("settings", 20);

export default function TabLayout() {
  const session = useSession();
  const {
    selectedGroupId,
    selectedGroupName,
    selectedShoppingListId,
    selectedShoppingListName,
  } = useShoppingStore();
  const { getColor } = useThemeColors();

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
    }

    void prefetch(trpc.shoppingList.getUserGroups.queryOptions());
  }, [selectedGroupId, selectedShoppingListId, session.data?.user]);

  if (!session.data?.user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      initialRouteName="index"
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
        name="index"
        options={{
          title: "Home",
          tabBarIcon: houseIcon ? () => houseIcon : undefined,
          tabBarItemHidden: true,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Your Groups",
          tabBarIcon: houseIcon ? () => houseIcon : undefined,
          tabBarItemHidden: !!selectedGroupId,
        }}
      />

      <Tabs.Screen
        name="shoppingLists"
        options={{
          title: selectedGroupName ?? "Shopping Lists",
          tabBarIcon: usersIcon ? () => usersIcon : undefined,
          tabBarItemHidden: !selectedGroupId,
        }}
      />
      <Tabs.Screen
        name="shoppingList"
        options={{
          title: selectedShoppingListName ?? "Shopping List",
          tabBarIcon: cartIcon ? () => cartIcon : undefined,
          tabBarItemHidden: !selectedShoppingListId,
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
