import { useMutation } from "@tanstack/react-query";
import { z } from "zod/v4";

import { trpc } from "~/utils/api";
import { storedValue } from "~/utils/stored-choice";

const persistedState = z.object({
  selectedGroupId: z.number().nullable().catch(null),
  selectedGroupName: z.string().nullable().catch(null),
  selectedShoppingListId: z.number().nullable().catch(null),
  selectedShoppingListName: z.string().nullable().catch(null),
});

type PersistedState = z.infer<typeof persistedState>;

const emptyState: PersistedState = {
  selectedGroupId: null,
  selectedGroupName: null,
  selectedShoppingListId: null,
  selectedShoppingListName: null,
};

const selection = storedValue(
  "shopping-store",
  (saved) => {
    if (saved === null) return emptyState;
    try {
      return persistedState.parse(JSON.parse(saved));
    } catch (error) {
      console.error(error);
      return emptyState;
    }
  },
  JSON.stringify,
);

export function useShoppingStore() {
  const stored = selection.useValue();
  const current = () => selection.get() ?? emptyState;

  const updateLastUsed = useMutation(
    trpc.shoppingList.updateLastUsed.mutationOptions(),
  );

  const setSelectedShoppingList = (
    shoppingListId: number,
    shoppingListName: string,
  ) => {
    const state = current();
    selection.save({
      ...state,
      selectedShoppingListId: shoppingListId,
      selectedShoppingListName: shoppingListName,
    });
    if (state.selectedShoppingListId !== shoppingListId) {
      updateLastUsed.mutate({ groupId: state.selectedGroupId, shoppingListId });
    }
  };

  const clearSelectedShoppingList = () =>
    selection.save({
      ...current(),
      selectedShoppingListId: null,
      selectedShoppingListName: null,
    });

  const setSelectedGroup = (
    groupId: number,
    groupName: string,
    list?: { id: number; name: string },
  ) => {
    const { selectedGroupId, selectedShoppingListId } = current();
    const hasChanged =
      selectedGroupId !== groupId ||
      (list !== undefined && selectedShoppingListId !== list.id);
    selection.save({
      selectedGroupId: groupId,
      selectedGroupName: groupName,
      selectedShoppingListId: list?.id ?? null,
      selectedShoppingListName: list?.name ?? null,
    });
    if (hasChanged) {
      updateLastUsed.mutate({ groupId, shoppingListId: list?.id ?? null });
    }
  };

  return {
    ...(stored ?? emptyState),
    hydrated: stored !== null,
    setSelectedGroup,
    setSelectedShoppingList,
    clearSelectedGroup: () => selection.save(emptyState),
    clearSelectedShoppingList,
  };
}
