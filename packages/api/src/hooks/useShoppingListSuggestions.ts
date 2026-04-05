import { useDebouncedValue } from "@tanstack/react-pacer";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "..";

type SuggestItemsResult = RouterOutputs["shoppingList"]["suggestItems"];

interface SuggestItemsInput {
  groupId: number;
  query: string;
}

export function useShoppingListSuggestions<
  TOptions extends { queryKey: readonly unknown[] },
>(
  createQueryOptions: (input: SuggestItemsInput) => TOptions,
  groupId: number | undefined,
  name: string,
) {
  const [debouncedQuery] = useDebouncedValue(name, { wait: 300 });

  const suggestionsEnabled =
    groupId !== undefined && debouncedQuery.length >= 1;

  const { data: suggestions } = useQuery<SuggestItemsResult>({
    ...createQueryOptions({
      groupId: groupId ?? 0,
      query: debouncedQuery || "",
    }),
    enabled: suggestionsEnabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const suggestionItems = suggestions?.success === true ? suggestions.data : [];
  const showSuggestions = name.length > 0 && suggestionItems.length > 0;

  return { suggestionItems, showSuggestions };
}
