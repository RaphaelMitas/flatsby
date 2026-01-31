import type { ToolPreferences } from "@flatsby/validators/chat/messages";
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DEFAULT_TOOL_PREFERENCES } from "@flatsby/validators/chat/messages";

import { useTRPC } from "~/trpc/react";

// Resolved tool preferences with non-nullable values
export interface ResolvedToolPreferences {
  toolsEnabled: boolean;
}

export interface UseToolPreferencesResult {
  updateToolPreferences: (newToolPreferences: ToolPreferences) => void;
  toolPreferences: ResolvedToolPreferences;
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
                  ...(newToolPreferences.toolsEnabled !== undefined
                    ? { lastToolsEnabled: newToolPreferences.toolsEnabled }
                    : {}),
                },
              },
            };
          },
        );
        return { previousData };
      },
      onError: (_error, _newToolPreferences, context) => {
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

  const toolPreferences = useMemo((): ResolvedToolPreferences => {
    return {
      toolsEnabled:
        userData?.success &&
        typeof userData.data.user?.lastToolsEnabled === "boolean"
          ? userData.data.user.lastToolsEnabled
          : DEFAULT_TOOL_PREFERENCES.toolsEnabled,
    };
  }, [userData]);

  const { mutate: mutateToolPreferences } = updateToolPreferencesMutation;

  const updateToolPreferences = useCallback(
    (newToolPreferences: ToolPreferences) => {
      void mutateToolPreferences({
        toolsEnabled: newToolPreferences.toolsEnabled,
      });
    },
    [mutateToolPreferences],
  );

  return {
    updateToolPreferences,
    toolPreferences,
  };
};
