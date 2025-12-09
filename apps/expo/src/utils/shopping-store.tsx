import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

interface ShoppingStoreState {
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectedShoppingListId: number | null;
  selectedShoppingListName: string | null;
  setSelectedGroup: (groupId: number, groupName: string) => void;
  setSelectedShoppingList: (
    shoppingListId: number,
    shoppingListName: string,
  ) => void;
  clearSelectedGroup: () => void;
  clearSelectedShoppingList: () => void;
}

const ShoppingStoreContext = createContext<ShoppingStoreState | null>(null);

export function ShoppingStoreProvider({ children }: { children: ReactNode }) {
  // User-selected overrides (null = use persisted value from server)
  const [groupIdOverride, setGroupIdOverride] = useState<number | null>(null);
  const [groupNameOverride, setGroupNameOverride] = useState<string | null>(
    null,
  );
  const [shoppingListIdOverride, setShoppingListIdOverride] = useState<
    number | null
  >(null);
  const [shoppingListNameOverride, setShoppingListNameOverride] = useState<
    string | null
  >(null);

  const { data: res } = useQuery(
    trpc.shoppingList.getCurrentUserWithGroups.queryOptions(),
  );
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );

  // Derive effective values: user override → persisted server data → null
  const persistedGroup = res?.success ? res.data.user?.lastGroupUsed : null;
  const persistedShoppingList = res?.success
    ? res.data.user?.lastShoppingListUsed
    : null;

  const selectedGroupId = groupIdOverride ?? persistedGroup?.id ?? null;
  const selectedGroupName = groupNameOverride ?? persistedGroup?.name ?? null;
  const selectedShoppingListId =
    shoppingListIdOverride ?? persistedShoppingList?.id ?? null;
  const selectedShoppingListName =
    shoppingListNameOverride ?? persistedShoppingList?.name ?? null;

  const setSelectedShoppingList = useCallback(
    (shoppingListId: number, shoppingListName: string) => {
      setShoppingListIdOverride(shoppingListId);
      setShoppingListNameOverride(shoppingListName);
      updateLastUsed.mutate({
        groupId: selectedGroupId,
        shoppingListId,
      });
    },
    [selectedGroupId, updateLastUsed],
  );

  const clearSelectedShoppingList = useCallback(() => {
    setShoppingListIdOverride(null);
    setShoppingListNameOverride(null);
  }, []);

  const setSelectedGroup = useCallback(
    (groupId: number, groupName: string) => {
      setGroupIdOverride((prevGroupId) => {
        if (prevGroupId !== groupId) {
          clearSelectedShoppingList();
        }
        return groupId;
      });
      setGroupNameOverride(groupName);
      updateLastUsed.mutate({
        groupId,
        shoppingListId: null,
      });
    },
    [clearSelectedShoppingList, updateLastUsed],
  );

  const clearSelectedGroup = () => {
    if (selectedShoppingListId || selectedShoppingListName) {
      clearSelectedShoppingList();
    }
    setGroupIdOverride(null);
    setGroupNameOverride(null);
  };

  return (
    <ShoppingStoreContext.Provider
      value={{
        selectedGroupId,
        selectedGroupName,
        selectedShoppingListId,
        selectedShoppingListName,
        setSelectedGroup,
        setSelectedShoppingList,
        clearSelectedGroup,
        clearSelectedShoppingList,
      }}
    >
      {children}
    </ShoppingStoreContext.Provider>
  );
}

export function useShoppingStore() {
  const context = useContext(ShoppingStoreContext);
  if (!context) {
    throw new Error(
      "useShoppingStore must be used within a ShoppingStoreProvider",
    );
  }
  return context;
}
