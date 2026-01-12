import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DEFAULT_TOOL_PREFERENCES } from "@flatsby/validators/chat/messages";

import { useTRPC } from "~/trpc/react";

export interface UseToolPreferencesResult {
  updateToolPreferences: (newToolPreferences: ToolPreferences) => void;
  toolPreferences: ToolPreferences;
}

export const useToolPreferences = (): UseToolPreferencesResult => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: userData } = useQuery(
    trpc.user.getCurrentUserWithGroups.queryOptions(),
  );

  const updateToolPreferencesMutation = useMutation(
    trpc.chat.updateToolPreferences.mutationOptions({
      onMutate: async (newToolPreferences) => {
        await queryClient.cancelQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
        const previousData = queryClient.getQueryData(
          trpc.user.getCurrentUserWithGroups.queryKey(),
        );
        queryClient.setQueryData(
          trpc.user.getCurrentUserWithGroups.queryKey(),
          (old) => {
            if (!old || old.success === false || !old.data.user) return old;

            return {
              ...old,
              data: {
                ...old.data,
                user: {
                  ...old.data.user,
                  ...(newToolPreferences.shoppingListToolsEnabled !== undefined
                    ? {
                        lastShoppingListToolsEnabled:
                          newToolPreferences.shoppingListToolsEnabled,
                      }
                    : {}),
                  ...(newToolPreferences.expenseToolsEnabled !== undefined
                    ? {
                        lastExpenseToolsEnabled:
                          newToolPreferences.expenseToolsEnabled,
                      }
                    : {}),
                },
              },
            };
          },
        );
        return { previousData };
      },
      onError: (error, newToolPreferences, context) => {
        queryClient.setQueryData(
          trpc.user.getCurrentUserWithGroups.queryKey(),
          context?.previousData,
        );
      },
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.user.getCurrentUserWithGroups.queryOptions(),
        );
      },
    }),
  );
  const toolPreferences = useMemo(() => {
    return {
      shoppingListToolsEnabled:
        userData?.success &&
        typeof userData.data.user?.lastShoppingListToolsEnabled === "boolean"
          ? userData.data.user.lastShoppingListToolsEnabled
          : DEFAULT_TOOL_PREFERENCES.shoppingListToolsEnabled,
      expenseToolsEnabled:
        userData?.success &&
        typeof userData.data.user?.lastExpenseToolsEnabled === "boolean"
          ? userData.data.user.lastExpenseToolsEnabled
          : DEFAULT_TOOL_PREFERENCES.expenseToolsEnabled,
    };
  }, [userData]);

  const { mutate: mutateToolPreferences } = updateToolPreferencesMutation;

  const updateToolPreferences = useCallback(
    (newToolPreferences: ToolPreferences) => {
      void mutateToolPreferences({
        shoppingListToolsEnabled: newToolPreferences.shoppingListToolsEnabled,
        expenseToolsEnabled: newToolPreferences.expenseToolsEnabled,
      });
    },
    [mutateToolPreferences],
  );

  return {
    updateToolPreferences,
    toolPreferences,
  };
};
