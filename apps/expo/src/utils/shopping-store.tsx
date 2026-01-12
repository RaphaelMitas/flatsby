import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

const STORAGE_KEY = "shopping-store";

interface PersistedState {
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectedShoppingListId: number | null;
  selectedShoppingListName: string | null;
}

interface ShoppingStoreState extends PersistedState {
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
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string | null>(
    null,
  );
  const [selectedShoppingListId, setSelectedShoppingListId] = useState<
    number | null
  >(null);
  const [selectedShoppingListName, setSelectedShoppingListName] = useState<
    string | null
  >(null);

  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );

  const persist = useCallback((state: PersistedState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(
      console.error,
    );
  }, []);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) {
          const parsed = JSON.parse(value) as PersistedState;
          setSelectedGroupId(parsed.selectedGroupId);
          setSelectedGroupName(parsed.selectedGroupName);
          setSelectedShoppingListId(parsed.selectedShoppingListId);
          setSelectedShoppingListName(parsed.selectedShoppingListName);
        }
      })
      .catch(console.error);
  }, []);

  const setSelectedShoppingList = useCallback(
    (shoppingListId: number, shoppingListName: string) => {
      setSelectedShoppingListId(shoppingListId);
      setSelectedShoppingListName(shoppingListName);
      persist({
        selectedGroupId,
        selectedGroupName,
        selectedShoppingListId: shoppingListId,
        selectedShoppingListName: shoppingListName,
      });
      updateLastUsed.mutate({
        groupId: selectedGroupId,
        shoppingListId,
      });
    },
    [selectedGroupId, selectedGroupName, updateLastUsed, persist],
  );

  const clearSelectedShoppingList = useCallback(() => {
    setSelectedShoppingListId(null);
    setSelectedShoppingListName(null);
    persist({
      selectedGroupId,
      selectedGroupName,
      selectedShoppingListId: null,
      selectedShoppingListName: null,
    });
  }, [selectedGroupId, selectedGroupName, persist]);

  const setSelectedGroup = useCallback(
    (groupId: number, groupName: string) => {
      setSelectedGroupId(groupId);
      setSelectedGroupName(groupName);
      setSelectedShoppingListId(null);
      setSelectedShoppingListName(null);
      persist({
        selectedGroupId: groupId,
        selectedGroupName: groupName,
        selectedShoppingListId: null,
        selectedShoppingListName: null,
      });
      updateLastUsed.mutate({
        groupId,
        shoppingListId: null,
      });
    },
    [updateLastUsed, persist],
  );

  const clearSelectedGroup = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedGroupName(null);
    setSelectedShoppingListId(null);
    setSelectedShoppingListName(null);
    persist({
      selectedGroupId: null,
      selectedGroupName: null,
      selectedShoppingListId: null,
      selectedShoppingListName: null,
    });
  }, [persist]);

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
