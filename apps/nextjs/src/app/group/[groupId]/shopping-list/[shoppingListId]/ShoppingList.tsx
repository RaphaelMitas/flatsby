"use client";

import type { ShoppingListInfiniteData } from "@flatsby/api";
import type { CategoryIdWithAiAutoSelect } from "@flatsby/validators/categories";
import type { ShoppingListItem as ShoppingListItemType } from "@flatsby/validators/shopping-list";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { InView } from "react-intersection-observer";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { useTRPC } from "~/trpc/react";
import ShoppingListItem, {
  OptimisticShoppingListItem,
} from "./ShoppingListItem";
import { ShoppingListItemAddForm } from "./ShoppingListItemAddForm";
import { groupShoppingList } from "./ShoppingListUtils";

const ShoppingList = ({
  groupId,
  shoppingListId,
}: {
  groupId: number;
  shoppingListId: number;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: shoppingListData } = useSuspenseQuery(
    trpc.shoppingList.getShoppingList.queryOptions({ groupId, shoppingListId }),
  );

  const {
    data: itemsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    trpc.shoppingList.getShoppingListItems.infiniteQueryOptions(
      { groupId, shoppingListId, limit: 20 },
      {
        getNextPageParam: (lastPage) =>
          lastPage.success === true ? lastPage.data.nextCursor : null,
      },
    ),
  );

  const { shoppingList, currentMember } =
    shoppingListData.success === true
      ? shoppingListData.data
      : { shoppingList: null, currentMember: null };
  const allItems =
    itemsData?.pages
      .flatMap((page) => (page.success === true ? page.data.items : []))
      .filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.id === item.id),
      ) ?? [];

  const { uncheckedSections, checkedSections } = groupShoppingList(allItems);

  const onMutateShoppingListItemError = (
    previousItems: ShoppingListInfiniteData | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
        groupId,
        shoppingListId,
        limit: 20,
      }),
      previousItems,
    );
  };

  const createShoppingListItemMutation = useMutation(
    trpc.shoppingList.createShoppingListItem.mutationOptions({
      onMutate: async ({ name, categoryId }) => {
        await queryClient.cancelQueries(
          trpc.shoppingList.getShoppingListItems.infiniteQueryOptions({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        );

        const previousItems = queryClient.getQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
          (old) => {
            if (!old) return old;

            const updatedPages = old.pages.map((page) => {
              if (page.success === false) return page;

              return {
                ...page,
                data: {
                  ...page.data,
                  items: [
                    {
                      id: Date.now(),
                      name,
                      categoryId,
                      createdAt: new Date(),
                      completed: false,
                      createdByGroupMemberId: currentMember?.id ?? null,
                      completedByGroupMemberId: null,
                      completedAt: null,
                      createdByGroupMember: currentMember,
                      completedByGroupMember: null,
                      isPending: true,
                    },
                    ...page.data.items,
                  ],
                },
              };
            });

            return { ...old, pages: updatedPages };
          },
        );
        return { previousItems };
      },
      onError: (err, variables, context) => {
        onMutateShoppingListItemError(context?.previousItems);
      },
      onSuccess: (data, variables, context) => {
        if (data.success === false) {
          onMutateShoppingListItemError(context.previousItems);
          return;
        }

        void queryClient.invalidateQueries({
          queryKey: trpc.shoppingList.getShoppingListItems.infiniteQueryKey({
            groupId,
            shoppingListId,
            limit: 20,
          }),
        });
      },
    }),
  );

  const handleSubmit = (values: {
    name: string;
    categoryId: CategoryIdWithAiAutoSelect;
  }) => {
    createShoppingListItemMutation.mutate({
      name: values.name,
      categoryId: values.categoryId,
      groupId,
      shoppingListId,
    });
  };

  const getShoppingListItem = (item: ShoppingListItemType) => {
    if (item.isPending)
      return (
        <OptimisticShoppingListItem
          key={item.id}
          {...item}
          groupMembers={shoppingList?.group.groupMembers ?? []}
        />
      );
    return (
      <ShoppingListItem
        key={item.id}
        groupId={groupId}
        shoppingListId={shoppingListId}
        item={item}
        groupMembers={shoppingList?.group.groupMembers ?? []}
      />
    );
  };

  const getShoppingList = (list: ShoppingListItemType[]) => {
    return <>{list.map(getShoppingListItem)}</>;
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto">
        {shoppingList && (
          <h2 className="text-center text-lg font-semibold">
            {shoppingList.name}
          </h2>
        )}
        <div className="space-y-2 px-4 pt-4">
          {uncheckedSections.map((section) => (
            <div
              className="space-y-2"
              key={`unchecked-section-${section.title}`}
            >
              <div className="text-muted-foreground text-center text-sm">
                {section.title}
              </div>
              {getShoppingList(section.items)}
            </div>
          ))}

          {checkedSections.length > 0 && (
            <div className="text-muted-foreground mt-4 text-center text-sm">
              Purchased Items
            </div>
          )}

          {checkedSections.map((section, index) => (
            <div className="space-y-2" key={`checked-section-${index}`}>
              <div className="text-muted-foreground text-center text-sm">
                {section.title}
              </div>
              {getShoppingList(section.items)}
            </div>
          ))}

          {hasNextPage && (
            <InView
              onChange={(inView) => {
                if (inView && !isFetchingNextPage && itemsData?.pages) {
                  void fetchNextPage();
                }
              }}
            >
              <div className="h-4" />
            </InView>
          )}
          {isFetchingNextPage && (
            <div className="flex justify-center pt-4">
              <LoadingSpinner />
            </div>
          )}
          {!hasNextPage && allItems.length > 0 && (
            <div className="text-muted-foreground py-4 text-center text-sm">
              No more items to load
            </div>
          )}
        </div>
      </div>
      <ShoppingListItemAddForm onSubmit={handleSubmit} />
    </>
  );
};

export default ShoppingList;
