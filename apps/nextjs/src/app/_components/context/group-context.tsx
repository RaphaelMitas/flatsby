"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

interface Group {
  id: number;
  name: string;
  profilePicture?: string | null;
}

interface ShoppingList {
  id: number;
  name: string;
  icon?: string | null;
  description?: string | null;
  createdAt: Date;
}

interface GroupContextValue {
  // Current state
  currentGroup: Group | null;
  currentShoppingList: ShoppingList | null;
  groups: Group[];
  isLoading: boolean;

  // Computed
  hasGroups: boolean;
  hasCurrentGroup: boolean;

  // Actions
  switchGroup: (groupId: number) => Promise<void>;
  switchShoppingList: (shoppingListId: number | null) => Promise<void>;
}

const GroupContext = createContext<GroupContextValue | null>(null);

export function GroupContextProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Get user data with groups and last used
  const { data: userWithGroups, isLoading } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  // Mutation for updating last used
  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions({
      onSuccess: () => {
        // Invalidate user data to refresh lastGroupUsed/lastShoppingListUsed
        void queryClient.invalidateQueries({
          queryKey: trpc.user.getCurrentUserWithGroups.queryKey(),
        });
      },
    }),
  );

  // Extract data
  const groups = useMemo(() => {
    if (!userWithGroups?.success) return [];
    return userWithGroups.data.groups;
  }, [userWithGroups]);

  const currentGroup = useMemo(() => {
    if (!userWithGroups?.success) return null;
    return userWithGroups.data.user?.lastGroupUsed ?? null;
  }, [userWithGroups]);

  const currentShoppingList = useMemo(() => {
    if (!userWithGroups?.success) return null;
    return userWithGroups.data.user?.lastShoppingListUsed ?? null;
  }, [userWithGroups]);

  // Switch group action
  const switchGroup = useCallback(
    async (groupId: number) => {
      await updateLastUsed.mutateAsync({
        groupId,
        shoppingListId: null, // Reset shopping list when switching groups
      });

      // Invalidate group-specific queries
      void queryClient.invalidateQueries({
        queryKey: trpc.shoppingList.getShoppingLists.queryKey({ groupId }),
      });
      void queryClient.invalidateQueries({
        queryKey: trpc.expense.getGroupExpenses.queryKey({ groupId }),
      });
    },
    [updateLastUsed, queryClient, trpc],
  );

  // Switch shopping list action
  const switchShoppingList = useCallback(
    async (shoppingListId: number | null) => {
      if (!currentGroup) return;

      await updateLastUsed.mutateAsync({
        groupId: currentGroup.id,
        shoppingListId,
      });
    },
    [updateLastUsed, currentGroup],
  );

  const value = useMemo<GroupContextValue>(
    () => ({
      currentGroup,
      currentShoppingList,
      groups,
      isLoading,
      hasGroups: groups.length > 0,
      hasCurrentGroup: currentGroup !== null,
      switchGroup,
      switchShoppingList,
    }),
    [
      currentGroup,
      currentShoppingList,
      groups,
      isLoading,
      switchGroup,
      switchShoppingList,
    ],
  );

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error("useGroupContext must be used within a GroupContextProvider");
  }
  return context;
}
