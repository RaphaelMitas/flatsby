import type { ApiResult, ShoppingListSummary } from "@flatsby/api";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";
import { useCallback, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";

import type { RouterOutputs } from "~/utils/api";
import { Button } from "~/lib/ui/button";
import { Form, FormField, useForm } from "~/lib/ui/form";
import { Input } from "~/lib/ui/input";
import { cn } from "~/lib/utils";
import { trpc } from "~/utils/api";
import { useShoppingStore } from "~/utils/shopping-store";
import DeleteConfirmationModal from "../DeleteConfirmationModal";

interface Props {
  shoppingList: Extract<
    RouterOutputs["shoppingList"]["getShoppingLists"],
    { success: true }
  >["data"][number];
  groupId: number;
}

const formSchema = z.object({
  shoppingListName: z
    .string()
    .min(1, {
      message: "Shopping list name is required",
    })
    .max(256, {
      message: "Shopping list name is too long",
    }),
});

const ShoppingListDashboardElement = ({ shoppingList, groupId }: Props) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { setSelectedShoppingList } = useShoppingStore();
  const swipeableRef = useRef<SwipeableMethods>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      shoppingListName: shoppingList.name,
    },
  });

  const rightActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const onMutateShoppingListError = (
    previousLists: ApiResult<ShoppingListSummary[]> | undefined,
  ) => {
    queryClient.setQueryData(
      trpc.shoppingList.getShoppingLists.queryKey({
        groupId,
      }),
      previousLists,
    );
  };

  const deleteShoppingListMutation = useMutation(
    trpc.shoppingList.deleteShoppingList.mutationOptions({
      onMutate: () => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              ...old,
              data: old.data.filter((list) => list.id !== shoppingList.id),
            };
          },
        );

        return { previousLists };
      },
      onSuccess: (data, variables, context) => {
        if (data.success === false) {
          onMutateShoppingListError(context.previousLists);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );
      },
      onError: (error, variables, context) => {
        onMutateShoppingListError(context?.previousLists);
      },
    }),
  );

  const renameShoppingListMutation = useMutation(
    trpc.shoppingList.changeShoppingListName.mutationOptions({
      onMutate: (data) => {
        void queryClient.cancelQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );

        const previousLists = queryClient.getQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
        );

        queryClient.setQueryData(
          trpc.shoppingList.getShoppingLists.queryKey({
            groupId,
          }),
          (old) => {
            if (!old?.success) {
              return old;
            }

            return {
              ...old,
              data: old.data.map((list) =>
                list.id === shoppingList.id
                  ? { ...list, name: data.name }
                  : list,
              ),
            };
          },
        );

        return { previousLists };
      },
      onSuccess: (data, variables, context) => {
        if (data.success === false) {
          onMutateShoppingListError(context.previousLists);
          return;
        }

        void queryClient.invalidateQueries(
          trpc.shoppingList.getShoppingLists.queryOptions({
            groupId,
          }),
        );
      },
      onError: (error, variables, context) => {
        onMutateShoppingListError(context?.previousLists);
      },
    }),
  );

  const handleRename = useCallback(
    (data: z.infer<typeof formSchema>) => {
      renameShoppingListMutation.mutate({
        shoppingListId: shoppingList.id,
        name: data.shoppingListName,
      });
      setIsRenaming(false);
      swipeableRef.current?.close();
    },
    [renameShoppingListMutation, shoppingList.id],
  );

  const handleCancelRename = useCallback(() => {
    setIsRenaming(false);
    form.reset({ shoppingListName: shoppingList.name });
    swipeableRef.current?.close();
  }, [form, shoppingList.name]);

  const handleDeleteList = () => {
    setShowDeleteModal(false);
    swipeableRef.current?.close();
    deleteShoppingListMutation.mutate({
      groupId,
      shoppingListId: shoppingList.id,
    });
  };

  const handleCloseModal = () => {
    setShowDeleteModal(false);
  };

  const handleListPress = () => {
    setSelectedShoppingList(shoppingList.id, shoppingList.name);
    router.push("/(tabs)/shoppingList");
  };

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      return (
        <Reanimated.View style={rightActionStyle}>
          <View className="bg-destructive h-full w-full items-end justify-center rounded-lg p-4">
            <Text className="text-destructive-foreground text-sm font-medium">
              Delete
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [rightActionStyle],
  );

  const renderLeftActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      return (
        <Reanimated.View style={leftActionStyle}>
          <View className="bg-primary h-full w-full items-start justify-center rounded-lg p-4">
            {isRenaming ? (
              <View className="flex-row items-center gap-2">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="shoppingListName"
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChangeText={field.onChange}
                        placeholder="Enter new name"
                        className="flex-1"
                        autoFocus
                      />
                    )}
                  />

                  <Button
                    title="Cancel"
                    variant="primary"
                    size="md"
                    onPress={handleCancelRename}
                  />
                  <Button
                    title="Save"
                    variant="secondary"
                    size="md"
                    onPress={form.handleSubmit(handleRename)}
                  />
                </Form>
              </View>
            ) : (
              <Text className="text-primary-foreground text-sm font-medium">
                Rename
              </Text>
            )}
          </View>
        </Reanimated.View>
      );
    },
    [leftActionStyle, isRenaming, form, handleCancelRename, handleRename],
  );

  const isOptimistic = shoppingList.id === -1;

  return (
    <>
      <ReanimatedSwipeable
        ref={swipeableRef}
        enabled={!isOptimistic}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={(direction) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (direction === "left") {
            // Show delete action briefly, then close and open modal
            setTimeout(() => {
              swipeableRef.current?.close();
              setShowDeleteModal(true);
            }, 300);
          } else {
            setIsRenaming(true);
          }
        }}
        onSwipeableClose={(direction) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (direction === "left") {
            handleCancelRename();
          }
        }}
      >
        <TouchableOpacity
          className={cn(
            "bg-muted flex-row items-center justify-between rounded-lg p-4",
            isOptimistic && "animate-pulse",
          )}
          disabled={isOptimistic}
          onPress={handleListPress}
          activeOpacity={0.7}
        >
          <View className="flex-1">
            <Text className="text-primary text-lg font-semibold">
              {shoppingList.name}
            </Text>
            {shoppingList.description && (
              <Text className="text-muted-foreground mt-1 text-sm">
                {shoppingList.description}
              </Text>
            )}
          </View>
          <Text className="text-muted-foreground text-sm">
            {shoppingList.uncheckedItemLength === 1
              ? "1 item left"
              : `${shoppingList.uncheckedItemLength} items left`}
          </Text>
        </TouchableOpacity>
      </ReanimatedSwipeable>

      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        onConfirm={handleDeleteList}
        itemName={shoppingList.name}
        title="Delete Shopping List"
        description={`Are you sure you want to delete "${shoppingList.name}"? This action cannot be undone and will permanently remove all items in this list.`}
        confirmationLabel={`To confirm deletion, please type the shopping list name: ${shoppingList.name}`}
      />
    </>
  );
};

export default ShoppingListDashboardElement;
