import type { ReactNode } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
  const [selectedGroupId, setSelectedGroupIdState] = useState<number | null>(
    null,
  );
  const [selectedGroupName, setSelectedGroupNameState] = useState<
    string | null
  >(null);
  const [selectedShoppingListId, setSelectedShoppingListIdState] = useState<
    number | null
  >(null);
  const [selectedShoppingListName, setSelectedShoppingListNameState] = useState<
    string | null
  >(null);
  const { data: res } = useQuery(
    trpc.shoppingList.getCurrentUserWithGroups.queryOptions(),
  );
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );

  const setSelectedShoppingList = useCallback(
    (shoppingListId: number, shoppingListName: string) => {
      setSelectedShoppingListIdState(shoppingListId);
      setSelectedShoppingListNameState(shoppingListName);
      updateLastUsed.mutate({
        groupId: selectedGroupId,
        shoppingListId,
      });
    },
    [selectedGroupId, updateLastUsed],
  );

  const clearSelectedShoppingList = useCallback(() => {
    setSelectedShoppingListIdState(null);
    setSelectedShoppingListNameState(null);
  }, []);

  const setSelectedGroup = useCallback(
    (groupId: number, groupName: string) => {
      setSelectedGroupIdState((prevGroupId) => {
        if (prevGroupId !== groupId) {
          clearSelectedShoppingList();
        }
        return groupId;
      });
      setSelectedGroupNameState(groupName);
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
    setSelectedGroupIdState(null);
    setSelectedGroupNameState(null);
  };

  useEffect(() => {
    if (res?.success) {
      if (selectedGroupId === null && res.data.user?.lastGroupUsed) {
        setSelectedGroup(
          res.data.user.lastGroupUsed.id,
          res.data.user.lastGroupUsed.name,
        );
      }
      if (
        selectedShoppingListId === null &&
        res.data.user?.lastShoppingListUsed
      ) {
        setSelectedShoppingList(
          res.data.user.lastShoppingListUsed.id,
          res.data.user.lastShoppingListUsed.name,
        );
      }
    }
  }, [
    res,
    selectedGroupId,
    selectedShoppingListId,
    setSelectedGroup,
    setSelectedShoppingList,
  ]);

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
