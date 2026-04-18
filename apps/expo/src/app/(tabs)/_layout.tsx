import { useEffect } from "react";
import { Platform } from "react-native";
import { useKeyboardState } from "react-native-keyboard-controller";
import LucideIcon from "@react-native-vector-icons/lucide";

import { Tabs } from "~/lib/components/bottom-tabs";
import { useSpringEffects } from "~/lib/ui/spring-effects";
import { useThemeColors } from "~/lib/utils";
import { usePostHogIdentify } from "~/utils/analytics/use-posthog-identify";
import { prefetch, trpc } from "~/utils/api";
import { useSession } from "~/utils/auth/auth-client";
import { useShoppingStore } from "~/utils/shopping-store";

const houseIcon = LucideIcon.getImageSourceSync("house", 20);
const shoppingBasketIcon = LucideIcon.getImageSourceSync("shopping-basket", 20);
const walletIcon = LucideIcon.getImageSourceSync("wallet", 20);
const settingsIcon = LucideIcon.getImageSourceSync("settings", 20);
// spring themed icons
const springHomeIcon = LucideIcon.getImageSourceSync("flower-2", 20);
const springCartIcon = LucideIcon.getImageSourceSync("cherry", 20);
const renderHiddenTabBar = () => null;

export default function TabLayout() {
  const session = useSession();
  const { selectedGroupId, selectedShoppingListId, selectedShoppingListName } =
    useShoppingStore();
  const { getColor } = useThemeColors();
  const { isEnabled: isSpringEffectsEnabled } = useSpringEffects();
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const shouldHideAndroidTabBar =
    Platform.OS === "android" && isKeyboardVisible;

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
            limit: 20,
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
            limit: 20,
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

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarActiveTintColor: getColor("primary"),
      }}
      tabBar={shouldHideAndroidTabBar ? renderHiddenTabBar : undefined}
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
          tabBarIcon: () =>
            isSpringEffectsEnabled ? springHomeIcon : houseIcon,
        }}
      />
      <Tabs.Screen
        name="shoppingList"
        options={{
          title: selectedShoppingListName ?? "Shopping List",
          tabBarIcon: () =>
            isSpringEffectsEnabled ? springCartIcon : shoppingBasketIcon,
          tabBarItemHidden: !selectedShoppingListId,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: () => walletIcon,
          tabBarItemHidden: !selectedGroupId,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: () => settingsIcon,
        }}
      />
    </Tabs>
  );
}
